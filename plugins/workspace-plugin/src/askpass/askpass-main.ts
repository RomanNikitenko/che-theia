/* eslint-disable header/header */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Based on: https://github.com/Microsoft/vscode/blob/dd3e2d94f81139f9d18ba15a24c16c6061880b93/extensions/git/src/askpass-main.ts.

import * as fs from 'fs';
import * as http from 'http';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fatal(err: any): void {
  console.error(err);
  process.exit(1);
}

function main(argv: string[]): void {
  let request;
  let prompt: string;

  if (argv.length === 5) {
    // git
    request = argv[2];
    prompt = 'Git: ' + argv[4].substring(1, argv[4].length - 2);
  } else if (argv.length === 7) {
    // ssh
    request = argv[2] + ' ' + argv[3];
    prompt = 'SSH: ' + argv[6].substring(1, argv[6].length - 2);
  } else {
    return fatal('Wrong number of arguments');
  }

  if (!process.env['CHE_THEIA_GIT_ASKPASS_HANDLE']) {
    return fatal('Missing handle');
  }

  if (!process.env['CHE_THEIA_GIT_ASKPASS_PIPE']) {
    return fatal('Missing pipe');
  }

  if (process.env['CHE_THEIA_GIT_COMMAND'] === 'fetch') {
    return fatal('Skip fetch commands');
  }

  const output = process.env['CHE_THEIA_GIT_ASKPASS_PIPE'];
  const socketPath = process.env['CHE_THEIA_GIT_ASKPASS_HANDLE'];

  const opts: http.RequestOptions = {
    socketPath,
    path: '/',
    method: 'POST',
  };

  const req = http.request(opts, res => {
    if (res.statusCode !== 200) {
      return fatal(`Bad status code: ${res.statusCode}`);
    }

    const chunks: string[] = [];
    res.setEncoding('utf8');
    res.on('data', (d: string) => chunks.push(d));
    res.on('end', () => {
      const raw = chunks.join('');

      try {
        const result = JSON.parse(raw);
        fs.writeFileSync(output, result + '\n');
      } catch (err) {
        return fatal('Error parsing response');
      }

      setTimeout(() => process.exit(0), 0);
    });
  });

  req.on('error', () => fatal('Error in request'));
  req.write(JSON.stringify({ request, prompt }));
  req.end();
}

main(process.argv);

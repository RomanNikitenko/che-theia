FROM quay.io/eclipse/che-custom-nodejs-deasync:12.18.2 as custom-nodejs
RUN apk add --update --no-cache sudo git bzip2 which bash curl openssh openssh-keygen less sshpass lsblk
FROM ${BUILD_ORGANIZATION}/${BUILD_PREFIX}-theia:${BUILD_TAG} as builder

#!/bin/bash

cd "$1";
/usr/bin/git checkout master;
/usr/bin/git fetch origin;
/usr/bin/git reset --hard origin/master;
/usr/bin/git pull;
/usr/bin/git status;
/usr/bin/npm i;
/usr/local/bin/pm2 save;
/usr/local/bin/pm2 reload $2 --update-env;

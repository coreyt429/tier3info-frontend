#!/usr/bin/env bash
set -euo pipefail

VERSION=`date +%Y%m%d%H%M`
npm --no-git-tag-version version patch
quasar build
git rm test_versions/*
mkdir -p test_versions
tar zcvf test_versions/test_$VERSION.tar.gz dist
git add test_versions/test_$VERSION.tar.gz
git add package.json
git add package-lock.json
git commit -a -m test_$VERSION
git push

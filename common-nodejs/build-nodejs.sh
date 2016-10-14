#!/bin/bash
set -e
rm -rf .git
# cloning project sources and installing dependencies
git clone $REPO project
cd project
#npm config set proxy http://buildproxy01.ae.sda.corp.telstra.com:3128
#npm config set https-proxy http://buildproxy01.ae.sda.corp.telstra.com:3128
npm config set registry https://repo1.ae.sda.corp.telstra.com/nexus/content/repositories/npmjs
npm install
echo 'Project installation complete!'

# ESLint check
eslint src/
echo 'Project ESLint verification complete!'

# Run Mocha unit tests
node_modules/mocha/bin/mocha -R mocha-bamboo-reporter
echo 'Project Mocha unit tests run complete!'
cp mocha.json ../../

# release new version
npm version patch -m "Release %s"
git push --all
git push --tags
echo 'Project version release complete!'

# generate apidocs
if [ -f "./node_modules/apidoc/bin/apidoc" ]
then
   echo 'Generating apidocs ...'
   ./node_modules/apidoc/bin/apidoc -i src
   if [ -f "./doc/api_data.json" ]
   then
      mv ./doc/api_data.json .
      rm -rf doc
      echo 'Apidoc data generated!'
   else
      echo 'Missing api_data.json file. No apidoc was generated!'
   fi
else
   echo 'This project does not support apidoc!'
fi

# generate Docker image
rm -rf node_modules
if [ -f "Dockerfile" ]
then
   echo "Dockerfile found - building image"
   cat package.json | node ../pkg2hor.js > horatio.json
   export RBENV_VERSION=2.1.0
   horatio --git-repo-url $REPO
   cp docker-image.json ../../
   echo 'Docker image build complete!'
else
   echo "No Dockerfile found"
fi

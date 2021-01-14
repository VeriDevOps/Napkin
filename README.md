# NAPKIN
NAPKIN is a fork/continuation of the SCANIA+RISE project SAGA https://github.com/scania/saga.git 

It is currently under some heavy development and depends on another private repo, btsaga. As soon as these dependencies have been resolved, the repository will be opened for the public. 


## Preparing the development environment
This README contains instruction for both Linux and Windows, so please be patient and keep reading!
# LINUX
### Starting with a newly installed ubuntu 16 LTS :

````
sudo apt-get update
sudo apt-get install --yes curl
curl --silent --location https://deb.nodesource.com/setup_8.x | sudo bash -

sudo apt-get install --yes nodejs

sudo apt-get install --yes npm
````

 No longer necessary (I think) sudo npm install npm@5.7 -g

# WINDOWS 
* https://nodejs.org/en/.    10.16.3 LTS
* Install python (e.g., Anaconda as shown further down)
 
# COMMON
```
npm install style-loader --save
sudo apt-get install --yes git

sudo apt install python3-pip3
sudo pip3 install autobahn
sudo pip3 install bottle
````
# Cloning the source 

Follow the guide on how 
Clone from the github https://github.blog/2013-09-03-two-factor-authentication/#how-does-it-work-for-command-line-git

`git clone https://github.com/scania/saga.git`
Give your personal access token instead of the password if you use 2FA. If you do not know what it is, you should probably try with your password. 

## Extra Dependencies
```
cd client 
npm install .
npm install bootstrap-vue@1.5.0
npm run dev
npm install  webpack@^1.0.0
npm install webpack@^2.2.0

```

For unknown reason, there is a npm_modules under 
`client/js/brace` as well. Probably only needed if you rebuild ace editor. A `npm install .`should do it if that is the case. 

````
cd client/js
node install .


````
There are also some "base" dependencies that needs to be installed with "npm install xxxxxxx"
ARNT ! Kan du lägga till här vad du gör för att det ska funka. Vi har uppdaterat till nyare node.js efter dokumentet skrevs så man behöver inte backa till 5.7 längre...


## A note about Continuum Anaconda Environment  (Windows / Mac)
MAC /WIN https://nodejs.org/en/download/current/
 * Node.js v9.7.1 to /usr/local/bin/node
 * npm v5.6.0 to /usr/local/bin/npm
	
	
 
	

If using Continuums Anaconda Navigator environment for python:
https://www.anaconda.com/download/

py3k is the environment with python3 i have created with
```
conda  create --name py3k python=3.5

source activate py3k
conda install pip
pip install autobahn
pip install bottle
```


# KARMA
* http://karma-runner.github.io/2.0/intro/installation.html
*  https://www.npmjs.com/package/karma-jasmine


```
npm install karma-jasmine --save-dev
npm install jasmine-core --save-dev

npm install ajv@^6.0.0
```

* Check with  `../server/> python3 server.py`
* fix errors until it starts cleanly.

* Go to `.../client/> npm run dev`
* If it is complaining about style-loader:
`npm install style-loader --save`

 




# Must have doc links
* Debugging the grammar
https://ohmlang.github.io/editor/#30325d346a6e803cc35344ca218d8636
‘

* The graphical elements used in the GUI:
* https://bootstrap-vue.js.org/

* https://gojs.net/latest/samples/sequenceDiagram.html



## TO BUILD A RELEASE:
In the e/saga/src/gaeditorweb2.1/client directory;
```
npm run build
```

Note that the produced file must be run in a web server in a structure like this:
```
X-
  |- dist
      |- build.js
  |- index.html
```

index.html should contain the following:
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>gaeditorweb2.1</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="dist/build.js"></script>
  </body>
</html v>
```

# License and other information
This project as a whole is licensed by Scania CV AB under the GNU General
Public License version 3.0 or any later version. For the avoidance of doubt,
Scania CV AB holds the patent
SE540377 *Methodology for testing using interactively changed traces* which
is related to this project. Should this patent be seen as covering whole or
parts of this project, this patent is explicitly considered part of the
*essential patent claims* as per the license.


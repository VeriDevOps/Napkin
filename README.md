# Wiping your T-EARS with NAPKIN
NAPKIN is a fork/continuation of the SCANIA+RISE project SAGA https://github.com/scania/saga.git <br> Napkin is currently(always) under heavy development and depends on another private repo, btsaga. As soon as these dependencies have been resolved, the repository will be opened for the public. 



## Running Napkin Without Back-End Servers:

    sudo apt-get update
    sudo apt-get upgrade --yes
    sudo apt-get install git --yes
    git clone https://danielFlemstrom@bitbucket.org/danielFlemstrom/napkin.git

Double click on the file: `~/napkin/dist/index.html`     



## Breaking news
2021-01-28 We have done a huge code break-out to collect the company specific parts in packages. You will now have to install the package bt from packages_src. If you use conda this is how to do it. 


    cd  <.....>napkin/packages_src/bt
    conda develop .


## Preparing the development environment
This README contains instruction for both Linux and Windows, so please be patient and keep reading!
# LINUX
### Starting with a newly installed ubuntu 20 LTS :
Install anaconda for python and environments from https://linuxize.com/post/how-to-install-anaconda-on-ubuntu-20-04/
Following is a copy of the instructions in above link:

    wget -P /tmp https://repo.anaconda.com/archive/Anaconda3-2020.02-Linux-x86_64.sh
    bash /tmp/Anaconda3-2020.02-Linux-x86_64.sh

You will ned to answer yes and stuff to complete the previous command.<br>
Close the terminal and open it again to get the PATH variable updates. <br>
In this new window, create and set an environment (in below its called py38):    

    conda create --name py38 python=3.8 --yes
    source activate py38

    conda install -c conda-forge autobahn --yes
    conda install -c conda-forge bottle   --yes
    conda install -c conda-forge python-dotenv --yes


Ubuntu Packages:

    sudo apt update
    sudo apt upgrade --yes
    sudo apt install --yes git 
    sudo apt install --yes npm 

Clone the Napkin Repository and Install the library

    git clone https://danielFlemstrom@bitbucket.org/danielFlemstrom/napkin.git
    
    
Install the company specific Server Packages:
    
    conda develop ~/napkin/packages_src/bt

Create a dot-env file 
  
    cd ~/napkin
    cp example.env .env

Edit above file to make it work for your company environment. 

Install the npm packages

    cd ../client
    npm install

You will see alot of warnings. This is because napkin neets to be updated to newer modules. 

Run the environment

    npm run dev


Some strange patching hope it is not required

    sudo npm cache clean -f
    sudo npm install -g n
    
    sudo n 10.16.3
    node -v
   
    sudo npm install -g npm@6.9.0
    npm -v
    

# WINDOWS 
* https://nodejs.org/en/.    10.16.3 LTS
* Install python (e.g., Anaconda as shown further down)
 
# COMMON
Follow these steps to install anaconda on the machine
https://linuxize.com/post/how-to-install-anaconda-on-ubuntu-20-04/

```
  npm install style-loader --save

  sudo apt install --yes python3-pip
  pip3 install autobahn
  pip3 install bottle
  pip3 install python-dotenv
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
  


```

For unknown reason, there is a npm_modules under 
`client/js/brace` as well. Probably only needed if you rebuild ace editor. A `npm install .`should do it if that is the case. 

````
    cd client/js
    node install .


````
There are also some "base" dependencies that needs to be installed with "npm install xxxxxxx"

 
```` 
  npm install  webpack@^1.0.0
  npm install webpack@^2.2.0

````

## A note about Continuum Anaconda Environment  (Windows / Mac)
MAC /WIN https://nodejs.org/en/download/current/
 * Node.js v9.7.1 to /usr/local/bin/node
 * npm v5.6.0 to /usr/local/bin/npm
	
	

If using Continuums Anaconda Navigator environment for python:
https://www.anaconda.com/download/

py3k is the environment with python3 i have created with
```
    conda  create --name py3k python=3.8

    source activate py3k
    conda install pip
    pip install autobahn
    pip install bottle
    pip install python-dotenv
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
In the ../client directory;
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


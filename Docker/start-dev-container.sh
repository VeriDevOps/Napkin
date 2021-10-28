export MY_LOCAL_GIT_PROJECT=$(dirname $(pwd)) 
echo Mounting $MY_LOCAL_GIT_PROJECT
docker container run --interactive -p 8080:8080 -p 4001:4001 --mount type=bind,source=$MY_LOCAL_GIT_PROJECT,target=/home/ubuntu/proj  --tty --rm tdev bash


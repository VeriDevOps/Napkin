
# This script is used for starting the servers 
# when the index.htm in dist is used instead of 
# npm run dev 
python3 server/sock_srv.py & 
python3 server/rest_srv.py & 
python3 packages_src/bt/bt/auto_updater.py &


# Running a Distribution

* Install all node and python dependencies 
* install the necessary internal packages :
     
    cd ..../packages_src/bt  
    conda develop .
   

* Copy the environment file:  
   `cp example.env .env`
* Make sure the contents reflects your current path settings etc. 
* Run the back-end servers with: 
    `. ./start_severs.sh `
* In the session/generated folder, double click on the ANALYSIS...html web page

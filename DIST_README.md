# Running a Distribution

* Install all node and python dependencies 
* install the necessary internal packages :
    <pre>
    cd ..../packages_src/bt  
    conda develop .
    </pre>

* Copy the environment file: <br>
 `cp example.env .env`
* Make sure the contents reflects your current path settings etc. 
* Run the back-end servers with:<br>
  `. ./start_severs.sh `
* In the session/generated folder, double click on the ANALYSIS...html web page

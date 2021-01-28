



#---------------------------------------------------------------------------------
# ------------------------   Parameters and Globals ------------------------------
#---------------------------------------------------------------------------------

# Use the .env file for these settings 



# Build absolute path with NAPKIN_BASE
from pathlib import Path  # Python 3.6+ only
from dotenv import load_dotenv
import os
cwd = os.path.dirname(os.path.realpath(__file__)) #/..../napkin/packages_src/bt/bt/
env_path = cwd +  '/../../../.env'
load_dotenv(dotenv_path=env_path)

napkin_base = os.getenv("NAPKIN_BASE")

default_log_dir           = napkin_base  +  os.getenv('DEFAULT_LOG_DIR')
default_log_dir_unpatched = r'NO UNPATCHED LOG FILES FOR NOW'
default_ga_dir            = napkin_base  +  os.getenv('DEFAULT_GA_DIR')
default_server_path       = napkin_base  +  os.getenv('DEFAULT_SERVER_PATH')
default_ga_motor          = napkin_base  +  os.getenv('DEFAULT_GA_MOTOR')
default_main_defs         = napkin_base  +  os.getenv('DEFAULT_MAIN_DEFS')
overview_output           = napkin_base  +  os.getenv('OVERVIEW_OUTPUT')

default_server_connection = napkin_base  +  os.getenv('DEFAULT_SERVER_CONNECTION')
  
var config = {
  "version":"2.0",
  "logFiles": [
              {"filename":'/Users/dfm01/Documents/aProjects/BT-Sensitive/SAGA-BT-C30-Study/Industrial_Eval/GA/DRS_Mutation/Reports/3_200_0_Passed_20200515_100005_TC-DriveBrake-S-005_SoftCCU_LOGDATA_20200515_100024_00.TXT',
               format:1}
              ],
  "globalDefs": '/Users/dfm01/Documents/aProjects/BT-Sensitive/SAGA-BT-C30-Study/Industrial_Eval/GA/GA_backup/main_definitions.ga',
  "gaFiles"   : ['/Users/dfm01/Documents/aProjects/BT-Sensitive/SAGA-BT-C30-Study/Industrial_Eval/GA/GA_backup/DRS_Mutation/GA/SR_C30_SRS_Safe-REQ-244.txt',
                ],
  //"gaText" :"def events kalle=[1,2,3]\ndef events olle=[1,4,10]\nwhile kalle or olle",
  "include"   :["result","siglist"]
//                 "include"   :["result","plots","minimal"]
};
exports.config = config;

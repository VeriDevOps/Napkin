/*---------------------------------------------------
                intervalsToSignal
----------------------------------------------------*/
// Converts Intervals to a Binary Signal representation
// where 1 represents true and 0 false. 
// The signal starts in 0 and ends in xmax.
function intervalsToSignal(S){
    var xmax = 200//EvalContext.getInstance().getXmax()
    var xAxis =[0]
    var values = [0];
  
    if(S.lenght == 0){ // empty Intervals
      return{xAxis:[0,max],values:[0,0]};
    }
    for (var i = 0; i < S.length; i++){
      if(i==0 && xAxis > xmax){
          // Push in an extra point at 0,0
          xAxis.push(S[i][0]);
          values.push(0);
      }
      xAxis.push(S[i][0]); // Start is high
      values.push(1);
     
      xAxis.push(S[i][1]); // end is Low
      values.push(0);  
    }
    // Since an interval always end in 0 we
    // can safely add a point at the end to get
    // a nice timeline
    if(xAxis[xAxis.length -1] < xmax){
      xAxis.push(xmax); // end is Low
      values.push(0);  
    }
  
  
    //console.log("intervalsToSignal",S,{xAxis:xAxis,values:values})
  //  console.trace();
    return{xAxis:xAxis,values:values};
  } // intervalsToSignal

testvals = [{S:[]},                // Empty Set
            {S:[[10,20]]},         // Single Interval
            {S:[[10,20],[20,30]]}, // Adjacent Intervals
            {S:[[10,20],[30,40],[50,60]]}];

testvals.forEach(element => {
    console.log("S=",element.S,"==>\n",intervalsToSignal(element.S))
});



  
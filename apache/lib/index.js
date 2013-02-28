var fs   = require('fs');

module.exports.outputCsv = function(header, data, outputFile)
{
  var file = fs.createWriteStream(outputFile);
  
  file.write(header.join(',')+"\n");
  
  for(var key in data){
    var d = data[key];
    var string = [];
    for(var k in d){
      string.push(d[k]);
    }
    file.write('"'+string.join('","')+'"'+"\n");
  }
  
}
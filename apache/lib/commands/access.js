var common = require('../index.js');
var fs = require('fs');
var path = require('path');

var AccessLog = function(inputFile, outputFile, app){
  //set up the app
  this.app = app;
  this.common = common;

  //the file locations
  this.accessLog = inputFile;
  
  //format the outputfilename
  this.outputFile = {
    dir: path.dirname(outputFile),
    fileSuffix: path.basename(outputFile)
  };
  
  //assumes the log format ofWBR format of
  this.logFormat =  '%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %D %P %{Host}i';
  
  //the regex for a line
  this.regex = /^([0-9a-zA-Z\-\.]+) - - \[([0-9]{2}\/[A-Za-z]{3}\/[0-9]{4}:[0-9]{2}:[0-9]{2}:[0-9]{2} -0800)\] "([A-Z]+) ([^" ]+) HTTP\/1\.[0-9]" ([0-9]{3}) ([0-9\-]+) "([^"]+)" "([^"]+)" ([0-9]+) ([0-9]+) ([a-z0-9\.\-:]+)$/;
  this.storeRegex = /(warnerartists.net|thestereoboutique.com)/;
  
}

AccessLog.prototype._filename = function(prefix)
{
  return path.join(this.outputFile.dir, prefix+'_'+this.outputFile.fileSuffix);
}

AccessLog.prototype.setRegex = function(regex)
{
  this.regex = new RegExp(regex);
}

AccessLog.prototype.help = function()
{
  this.app.log.help("--input          specify a single input file");
  this.app.log.help("--output         specify an output file");
  this.app.log.help("--help           display this help");
  this.app.log.help("--report         report to run");
}

AccessLog.prototype.parse = function(reportType)
{
  //create the stream
  var file = fs.createReadStream(this.accessLog);
  this._parsedLine = 0;
  this.reportType = reportType;
  
  var reporter = require('./access/'+reportType);
  this.reporter = new reporter(this);
  
  //START THE REPORT
  this.reporter.init();
  
  //assign the events
  file.on('data', this._parseLine.bind(this));
  file.on('end', function(){
    //finish the report
    this.reporter.finish();
  }.bind(this));
}

AccessLog.prototype._parseLine = function(line)
{
  var strings = line.toString().split("\n");
  
  for(var i = 0; i < strings.length; i++){
    var string = strings[i];
    var matches = string.match(this.regex);
    
    this._parsedLine++;
      
    if(!matches){
      continue;
    }
  
    //arrange the data
    var lineData = {
      ipAddress: matches[1],
      timeStamp: matches[2].replace(/\//g, ' ').replace(':', ' '),
      method: matches[3],
      requestPath: matches[4],
      responseCode: matches[5],
      responseSize: matches[6],
      referrer: matches[7],
      agentCode: matches[8],
      pageTime: parseInt(matches[9]) / 1000000,
      processId: matches[10], 
      site: matches[11]
    };
    
    //BUILD REPORT ITEM
    this.reporter.parse(lineData);
  }
}


//run the function
var access = module.exports = function accessLog (cmd, cb) {
  
  var parser = new AccessLog(this.argv.input, this.argv.output, this);
  
  //print help
  if(cmd == 'help'){
    parser.help();
    cb(null);
    return;
  }


  //start the object
  if(this.argv.output){
    parser.parse(this.argv.report);
  }
  
  cb(null);
};
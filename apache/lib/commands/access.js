var common = require('../index.js');
var fs = require('fs');
var path = require('path');

var AccessLog = function(inputFile, outputFile, app){
  //set up the app
  this.app = app;

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
  this.checkoutRegex = /^\/[a-z]{2}\/checkout\//;
  this.checkoutLocaleRegex = /^\/[a-z]{2}([\/a-zA-Z0-9]+)$/;
  
  //start the data array
  this.data = [];
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
  this.app.log.help("--dir            specify an input file directory, all files in directory will be parsed");
  this.app.log.help("--output         specify an output file");
  this.app.log.help("--regex=\"...\"  specify a custom regex");
  this.app.log.help("--help           display this help");
}

AccessLog.prototype.parse = function()
{
  //create the stream
  var file = fs.createReadStream(this.accessLog);
  this._parsedLine = 0;
  
  
  //START THE REPORT
  this.checkoutReport = {};
  
  //assign the events
  file.on('data', this._parseLine.bind(this));
  file.on('end', function(){
    //this._buildUrlLoadTimeReport();
    //this._buildErrorReport();
    //this._buildCheckoutReport();
    
    this._buildCheckoutReportFinish();
  }.bind(this));
}

AccessLog.prototype._buildCheckoutReport = function()
{
  console.log('Start Checkout Report');
  
  this.checkoutReport = {};
  
  for(var i = 0; i < this.data.length; i++){
    var data = this.data[i];
    this._buildCheckoutReportItem(data);
  }
  
  this._buildCheckoutReportFinish();
}

AccessLog.prototype._buildCheckoutReportItem = function(data)
{
  if(!data.site.match(this.storeRegex) || !data.requestPath.match(this.checkoutRegex)){
    return;
  }
  
  var path = data.requestPath.split('?')[0];
  path = path.split('uenc')[0];
  
  var checkoutPath = path.match(this.checkoutLocaleRegex);
  if(!checkoutPath){
    return;
  }
  path = checkoutPath[1];
  var date = new Date(data.timeStamp).toJSON().split('T')[0];
  
  var identifier = path+'-'+data.responseCode+'_'+date;
  
  //we're interested in overall checkout paths
  if(!this.checkoutReport[identifier]){
    this.checkoutReport[identifier] = {
      path: path,
      responseCode: data.responseCode,
      date: date,
      count: 0,
      timeAve: 0,
      timeMax: data.pageTime,
      timeMin: data.pageTime
    }
  }
  //update the values
  this.checkoutReport[identifier].count++;
  this.checkoutReport[identifier].timeAve += data.pageTime;
  if(this.checkoutReport[identifier].timeMin > data.pageTime){
    this.checkoutReport[identifier].timeMin = data.pageTime;
  }
  if(this.checkoutReport[identifier].timeMax < data.pageTime){
    this.checkoutReport[identifier].timeMax = data.pageTime;
  }
}

AccessLog.prototype._buildCheckoutReportFinish = function()
{
  console.log('Sort out averages');
  
  //build the averages
  for(var key in this.checkoutReport){
    this.checkoutReport[key].timeAve = this.checkoutReport[key].timeAve / this.checkoutReport[key].count;
  }
  
  console.log('output to csv');
  common.outputCsv(['path','code','date','hit count','average load time','max load time','min load time'], this.checkoutReport, this._filename('checkout-report'));
}

AccessLog.prototype._buildErrorReport = function()
{
  this.errorReport = {};
  
  for(var i = 0; i < this.data.length; i++){
    var data = this.data[i];
    if(!data.site.match(this.storeRegex) || data.responseCode == 200){
      continue;
    }
  
    var path = data.requestPath.split('?')[0];
    path = path.split('uenc')[0];
    
    var identifier = path+'-'+data.responseCode;
    
    //we're not interested in site - just path and code
    if(!this.errorReport[identifier]){
      this.errorReport[identifier] = {
        path: path,
        timeAve: 0,
        count: 0,
        responseCode: data.responseCode,
        timeMax: data.pageTime,
        timeMin: data.pageTime
      }
    }
    
    //update the information
    this.errorReport[identifier].timeAve += data.pageTime;
    this.errorReport[identifier].count++;
    if(this.errorReport[identifier].timeMin > data.pageTime){
      this.errorReport[identifier].timeMin = data.pageTime;
    }
    if(this.errorReport[identifier].timeMax < data.pageTime){
      this.errorReport[identifier].timeMax = data.pageTime;
    }
  }
  
  //build the averages
  for(var key in this.errorReport){
    this.errorReport[key].timeAve = this.errorReport[key].timeAve / this.errorReport[key].count;
  }
  
  common.outputCsv(['path','average load time','hit count','code','max load time','min load time'], this.errorReport, this._filename('error-report'));
}

AccessLog.prototype._buildUrlLoadTimeReport = function()
{
  this.loadtimeReport = {};
  
  for(var i = 0; i < this.data.length; i++){
    var data = this.data[i];
    
    var path = data.requestPath.split('?')[0];
    path = path.split('uenc')[0];
    var identifier = data.site+'-'+path;
    
    if(!data.site.match(this.storeRegex)){
      continue;
    }
    
    //setup the data for the first thing
    if(!this.loadtimeReport[identifier]){
      this.loadtimeReport[identifier] = {
        site: data.site,
        url: path,
        timeAve: 0,
        count: 0,
        timeMin: data.pageTime,
        timeMinDate: new Date(data.timeStamp).toJSON().replace('T', ' ').split('.')[0],
        timeMax: data.pageTime,
        timeMaxDate: new Date(data.timeStamp).toJSON().replace('T', ' ').split('.')[0]
      };
    }
    
    //update
    this.loadtimeReport[identifier].timeAve += data.pageTime;
    this.loadtimeReport[identifier].count++;
    if(this.loadtimeReport[identifier].timeMin > data.pageTime){
      this.loadtimeReport[identifier].timeMin = data.pageTime;
      this.loadtimeReport[identifier].timeMinDate = new Date(data.timeStamp);
    }
    if(this.loadtimeReport[identifier].timeMax < data.pageTime){
      this.loadtimeReport[identifier].timeMax = data.pageTime;
      this.loadtimeReport[identifier].timeMaxDate = new Date(data.timeStamp);
    }
  }
  
  //now calculate the averages
  for(var key in this.loadtimeReport){
    this.loadtimeReport[key].timeAve = this.loadtimeReport[key].timeAve / this.loadtimeReport[key].count;
  }
  
  //output to CSV
  common.outputCsv(['site','path','average load time','hit count','shortest load time','shortest load timestamp','longest load time','longest load timestamp'], this.loadtimeReport, this._filename('load-report'));
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
    this._buildCheckoutReportItem(lineData);
    
    //this.data.push(lineData);
  }
  console.log('Data Parsed - '+this._parsedLine);
}


//run the function
var access = module.exports = function accessLog (cmd, cb) {
  
  //print help
  if(cmd == 'help'){
    AccessLog.help();
    cb(null);
    return;
  }


  //start the object
  if(this.argv.output){
    var parser = new AccessLog(this.argv.input, this.argv.output, this);
    parser.parse();
  }
  
  cb(null);
};
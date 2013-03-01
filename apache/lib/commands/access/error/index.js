var ErrorReport = function(accessLog)
{
  this.accessLog = accessLog;
}

ErrorReport.prototype.init = function()
{
  this.data = {};
}

ErrorReport.prototype.parse = function(data)
{
  if(!data.site.match(this.accessLog.storeRegex) || data.responseCode == 200){
    return;
  }

  var path = data.requestPath.split('?')[0];
  path = path.split('uenc')[0];
  
  var identifier = path+'-'+data.responseCode;
  
  //we're not interested in site - just path and code
  if(!this.data[identifier]){
    this.data[identifier] = {
      path: path,
      timeAve: 0,
      count: 0,
      responseCode: data.responseCode,
      timeMax: data.pageTime,
      timeMin: data.pageTime
    }
  }
  
  //update the information
  this.data[identifier].timeAve += data.pageTime;
  this.data[identifier].count++;
  if(this.data[identifier].timeMin > data.pageTime){
    this.data[identifier].timeMin = data.pageTime;
  }
  if(this.data[identifier].timeMax < data.pageTime){
    this.data[identifier].timeMax = data.pageTime;
  }
}

ErrorReport.prototype.finish = function()
{
  //build the averages
  for(var key in this.data){
    this.data[key].timeAve = this.data[key].timeAve / this.data[key].count;
  }
  
  this.accessLog.common.outputCsv(['path','average load time','hit count','code','max load time','min load time'], this.data, this.accessLog._filename('error-report'));

}

module.exports = ErrorReport;
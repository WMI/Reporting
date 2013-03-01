var LoadTimeReport = function(accessLog)
{
  this.accessLog = accessLog;
}

LoadTimeReport.prototype.init = function()
{
  this.data = {};
}

LoadTimeReport.prototype.parse = function(data)
{
  var path = data.requestPath.split('?')[0];
  path = path.split('uenc')[0];
  var identifier = data.site+'-'+path;
  
  if(!data.site.match(this.accessLog.storeRegex)){
    return;
  }
  
  //setup the data for the first thing
  if(!this.data[identifier]){
    this.data[identifier] = {
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
  this.data[identifier].timeAve += data.pageTime;
  this.data[identifier].count++;
  if(this.data[identifier].timeMin > data.pageTime){
    this.data[identifier].timeMin = data.pageTime;
    this.data[identifier].timeMinDate = new Date(data.timeStamp).toJSON().replace('T', ' ').split('.')[0];
  }
  if(this.data[identifier].timeMax < data.pageTime){
    this.data[identifier].timeMax = data.pageTime;
    this.data[identifier].timeMaxDate = new Date(data.timeStamp).toJSON().replace('T', ' ').split('.')[0];
  }
}

LoadTimeReport.prototype.finish = function()
{
  //now calculate the averages
  for(var key in this.data){
    this.data[key].timeAve = this.data[key].timeAve / this.data[key].count;
  }
  
  //output to CSV
  this.accessLog.common.outputCsv(['site','path','average load time','hit count','shortest load time','shortest load timestamp','longest load time','longest load timestamp'], this.data, this.accessLog._filename('loadtime-report'));
}

module.exports = LoadTimeReport;
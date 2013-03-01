var HomepageReport = function(accessLog)
{
  this.accessLog = accessLog;
}

HomepageReport.prototype.init = function()
{
  this.data = {};
  this.responseCodeList = {};
}

HomepageReport.prototype.parse = function(data)
{
  if(!data.site.match(this.accessLog.storeRegex)){
    return;
  }

  var path = data.requestPath.split('?')[0];
  path = path.split('uenc')[0];
  
  if(path != '/'){
    return;
  }
  
  var date = new Date(data.timeStamp).toJSON().split('T')[0];
  
  var identifier = data.site+'-'+path+'-'+date;
  
  if(!this.data[identifier]){
    this.data[identifier] = {
      path: path,
      site: data.site,
      date: date,
      count: 0,
    }
  }
  
  //make sure we have a count for the response code
  if(!this.data[identifier][data.responseCode]){
    this.data[identifier][data.responseCode] = 0;
  }
  
  //update the counts
  this.data[identifier].count++;
  this.data[identifier][data.responseCode]++;
  
  //make sure we have the code in the full array
  this.responseCodeList[data.responseCode] = data.responseCode;

}

HomepageReport.prototype.finish = function()
{
  var headers = [];
  //normalise the data
  for(var key in this.data){
    for(var code in this.responseCodeList){
      if(!this.data[key][code]){
        this.data[key][code] = 0;
      }
    }
    
    if(headers.length == 0){
      for(var k in this.data[key]){
        headers.push(k);
      }
    }
  }
  
  //now ensure that all data is the right data
  for(var key in this.data){
    var normalisedData = {};
    for(var i = 0; i < headers.length; i++){
      //console.log(headers[i]);
      normalisedData[headers[i]] = this.data[key][headers[i]];
    }
    //console.log(normalisedData, headers, this.errorReport[key]);
    this.data[key] = normalisedData;
  }
  
  
  this.accessLog.common.outputCsv(headers, this.data, this.accessLog._filename('homepage-report'));
}

module.exports = HomepageReport;
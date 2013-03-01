var CheckoutReport = function(accessLog)
{
  this.accessLog = accessLog;
  this.checkoutRegex = /^\/[a-z]{2}\/checkout\//;
  this.checkoutLocaleRegex = /^\/[a-z]{2}([\/a-zA-Z0-9]+)$/;
}

CheckoutReport.prototype.init = function()
{
  this.data = {};
}

CheckoutReport.prototype.parse = function(data)
{
  if(!data.site.match(this.accessLog.storeRegex) || !data.requestPath.match(this.checkoutRegex)){
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
  if(!this.data[identifier]){
    this.data[identifier] = {
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
  this.data[identifier].count++;
  this.data[identifier].timeAve += data.pageTime;
  if(this.data[identifier].timeMin > data.pageTime){
    this.data[identifier].timeMin = data.pageTime;
  }
  if(this.data[identifier].timeMax < data.pageTime){
    this.data[identifier].timeMax = data.pageTime;
  }
}

CheckoutReport.prototype.finish = function()
{
  //build the averages
  for(var key in this.data){
    this.data[key].timeAve = this.data[key].timeAve / this.data[key].count;
  }
  
  this.accessLog.common.outputCsv(['path','code','date','hit count','average load time','max load time','min load time'], this.data, this.accessLog._filename('checkout-report'));
}

module.exports = CheckoutReport;
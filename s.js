const fs = require('fs')
const path = require('path');
const download = require('image-downloader');
const fetch = require('node-fetch');
const db = require('./database');
const axios = require('axios');
async function run(){
    await insertLatestGames();
    await insertOtherCompanyGames();
    await delay(60)
    run();
    
}
async function insertLatestGames(){
    for(let i=1;true;i++ ){
        var newItem=true,data,res=await getLatestData(i);//bütün veriyi çekmek için newitem false yap
        try { data=JSON.parse(res).data } catch (error) { console.log("cannot parse! (Main Loop)"); break;}
        if(data.length==0) break;
        for ( item of data) {
          let tmpBool = (await insertGameById(item.i));
          if(tmpBool){
            newItem=false;
          }
        }
        if(newItem){
            break;
        }
        console.log(4);
    }
}
async function insertOtherCompanyGames(){
    
    var data=await new db().query("SELECT * FROM coda.Companys WHERE get_games='0';")  
    console.log("companys which has any not inserted games count:"+data.length) 
    for (let item of data) {
        var resc=await getCompanyGames(item.di)
        try {  obj=JSON.parse(resc); if(obj.apps.data==undefined || obj.data==undefined) throw "" } catch (error) { console.log("No data (Insert company games Loop) companyId="+item.id); continue;}
        for (let game of obj.apps.data) {
            await insertGameById(game.id)
        }
        await new db().update({ get_games:"1"},{id:item.id},"Companys")
    }

}
async function getCompanyGames(companyId){
    try{
    var res=await fetch("https://shire.codaplatform.com/web/v1/dev/"+companyId, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          "authorization": "Bearer session:c:13826:1qfxvpX1vouSR9Y2zTCjCIOXUTp",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "cookie": "_ga=GA1.2.1523260663.1617484534; _gid=GA1.2.1327822279.1617484534; _hjid=b9a3a3e1-f927-4b25-aaeb-8c29fb872807; _hjTLDTest=1; _hjAbsoluteSessionInProgress=0; intercom-session-z9t74ij8=QzhFbHFmdjB3N0F0V3RnT2JZRW9VbEtWQTFRQkF5c2pTeDJsckJpdjYzQlJscy96QnJjV3NoK1huUUtwVmJKbS0tTllvL2JTN2JReDZqTmRPS3NrN1dOQT09--3fe716820731df9a8b88700e66eb3cb99315b24d"
        },
        "referrer": "https://dash.codaplatform.com/developer/Baronie%20Drew/1XxvqqKMmPAVx7iAYfwdEzZjyyF",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": null,
        "method": "GET",
        "mode": "cors"
      });
      console.log("1")
      return await res.text()
    } catch (error) {
        return null;
    }
}
async function insertGameById(gameI){
    var checkGame=(await new db().selectQuery({  i : gameI },"Games") )
    if ( checkGame && checkGame.length>0  ){
        return false;
    }
    var res=await getInformationOfGame(gameI);
    try {  obj=res.data } catch (error) { console.log("No data (Insert game Loop) gameId="+gameI); return false;}
   
    //game obj
    insertObj={ n:obj.name,di:obj.developer_id,dn:obj.developer,i:gameI,rd:obj.released,bundle_id: obj.bundle_id , description: obj.description, country:obj.country ,app_store_url:obj.app_store_url,version:obj.version,video_url:obj.video_url ,avg_rating:obj.avg_rating }
    
    //company
    var checkCompany=(await new db().selectQuery({  text :  obj.developer },"Companys") )
    if ( checkCompany && checkCompany.length>0  ){
        insertObj.companyId=checkCompany[0].id;
    }else{
        var companyId=(await new db().insert({ text:obj.developer ,di:obj.developer_id},"Companys")).insertId;
        console.log("Company added:"+obj.developer );
        insertObj.companyId=companyId;
    }
    
    //game
    try { insertObj.description=insertObj.description.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, ''); } catch (error) { console.log("Description error gameI="+gameI); }
    try { var gameId=(await new db().insert(insertObj,"Games")).insertId; } catch (error) { console.log("couldnt insert gameId="+gameI);return false; }
    console.log("game added:"+gameId);
    //category
    let tmpCategorys=[];
    if(obj.tag_groups){
        for (let tag of obj.tag_groups) {
            if(tag.name == "Core Mechanics" || tag.name=="Secondary Mechanics"){
                for (let rtag of tag.tags) {
                    tmpCategorys.push(rtag.name)
                }
            }                   
        }
    }
    
    for ( category of tmpCategorys) {
        var checkCategory=(await new db().selectQuery({  text : category },"Categorys") )
        if ( checkCategory && checkCategory.length>0  ){
            await new db().insert({ gameId : gameId , categoryId:checkCategory[0].id},"Game_Categorys");
        }else{
            var categoryId=(await new db().insert({ text: category},"Categorys")).insertId;
            console.log("category added:"+category);
            await new db().insert({ gameId : gameId , categoryId:categoryId},"Game_Categorys");
        }
    }

    if(obj.artwork_url){
       await dowloandImage(0,gameId,obj.artwork_url)
    }
    if(obj.screenshots){
        var i=1;
        for ( img of obj.screenshots) {
            await dowloandImage(i,gameId,img)
            i++;
        }
    }
    console.log("5");
    return true;
}
async function getLatestData(index){
    var res=await fetch("https://shire.codaplatform.com/web/v1/intelligence/tab/preLaunch?dr=30+Days&page="+index, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          "authorization": "Bearer session:c:13826:1qfxvpX1vouSR9Y2zTCjCIOXUTp",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "cookie": "_ga=GA1.2.1523260663.1617484534; _gid=GA1.2.1327822279.1617484534; _hjTLDTest=1; _hjid=b9a3a3e1-f927-4b25-aaeb-8c29fb872807; _hjFirstSeen=1; _hjAbsoluteSessionInProgress=0; intercom-session-z9t74ij8=OC9VdjF1cEN5MzZaWEJEVEZPYlB6MFpSeTE4U2oxbWxGS0EweWhWdE9pU2ZodlN3K1NPa0Z4a05JTmdvR0NVNS0tME54d1FWZHQrWnFlOFV2TWNUdVVVZz09--797e2c316417f7327eaf11754f8886763a423175"
        },
        "referrer": "https://dash.codaplatform.com/market-intelligence?name=preLaunch",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": null,
        "method": "GET",
        "mode": "cors"
      })
      console.log("2")
      return await res.text()
}
async function getInformationOfGame(gameI){
    try {
        var res=await axios({
            method: 'get',
            url: 'https://shire.codaplatform.com/web/v1/app/'+gameI,
            headers: {
                "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36"
            },
        });
        console.log("3")
        return res.data;
    } catch (error) {
        return null;
    }
    
}
run();
async function delay(sec){
    await new Promise(resolve => setTimeout(resolve, sec*1000));
}

async function dowloandImage(name,gameId,link){
    var fileName=name+".jpg";
    var dir=path.join(__dirname, './images/'+gameId+"/") 
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    if ( ! fs.existsSync(path.join(__dirname, './images/'+gameId+"/") + fileName)) {
        try { 
            await download.image({ url: link, dest: path.join(__dirname, './images/'+gameId+"/") + fileName  });
            console.log('Saved to', fileName);
            await new db().insert({ gameId : gameId , text:fileName},"Game_Images");   
         } catch (error) {
             console.log(link)
             console.log("resim yüklenemedi gameId:"+gameId)
            }
    }
}

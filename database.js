const mysql = require( 'mysql' );
class Database {
    constructor() {
        this.databaseName = "coda";
        this.connection = mysql.createConnection( {
            host: "localhost",
            user: "root",
            password: "password",
            multipleStatements: true,
            dateStrings: 'date'
          } );
        
    }
    async query( sql, args, close=true,returnRejectedData=false,ignoreError=false ) {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err, rows ) => {
               
                if ( err )  {
                    var rejected={message:"veritabanihatasi" };
                    switch (err.code) {
                        case "ER_DUP_ENTRY":
                            rejected.colName=err.sqlMessage.substring(err.sqlMessage.search("key ")+5,err.sqlMessage.search("_UNIQUE"));
                            rejected.colData=err.sqlMessage.substring(err.sqlMessage.search("entry ")+6,err.sqlMessage.search(" for key"));
                            rejected.message="buverihalihazirdavar";
                            break;
                        case "ER_OPERAND_COLUMNS":
                            rejected.message="veriicindebulunmamasigerekverivar";
                            break;
                        case "ER_NO_SUCH_TABLE":
                            rejected.message="tablobulunamadi";
                            break;
                        case "ER_TRUNCATED_WRONG_VALUE":
                            rejected.message="hatalideger";
                            break;
                        default:
                            break;
                    }
                    console.log(err);
                    if(returnRejectedData) {
                        rejected.data=args;
                    }
                    return ignoreError? resolve( rejected ) : reject( rejected );
                    
                }
                if ( close ) this.close();
                resolve( rows );
            } );
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
    selectAll(tableName,extra="",countRow=false,databaseName=this.databaseName){
        if(extra==null){
            extra="";
        }
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        var query=`SELECT ${ countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${databaseName}.${tableName} WHERE deleted=0 ${extra};${ countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
        return this.query(query);
    }
    selectQuery(where={},tableName,mode="AND",extra="",countRow=false,databaseName=this.databaseName){
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        var query="";
        query=selectQueryConverter(tableName,databaseName,where,mode,extra,countRow);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
    selectLike(tableName,where,mode="AND",extra="",countRow=false,databaseName=this.databaseName){
        //var a=await new db().selectWithColumn(["id","a"],"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        
        var query="";
        query=selectLikeConverter(tableName,databaseName,where,mode,extra,countRow);
        if(!where){
            where={};
        }
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> "%"+where[y]+"%"));
    }
    selectLikeWithColumn(colNameS=[],tableName,where,mode="AND",databaseName=this.databaseName){
        //var a=await new db().selectWithColumn(["id","a"],"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(colNameS.length==0){
            throw "kolonisimlerieksik";
        }
        var query="";
        query=selectLikeWithColumnConverter(tableName,databaseName,colNameS,where,mode);
        if(!where){
            where={};
        }
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> "%"+where[y]+"%"));
    }
    selectWithColumn(colNameS=[],tableName,where,mode="AND",databaseName=this.databaseName){
        //var a=await new db().selectWithColumn(["id","a"],"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(colNameS.length==0){
            throw "kolonisimlerieksik";
        }
        var query="";
        query=selectWithColumnConverter(tableName,databaseName,colNameS,where,mode);
        if(!where){
            where={};
        }
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
    async insert(data={},tableName,databaseName=this.databaseName){
        //await new db().insert({ a:"azxzcxzxczsol",b:"1231"},"test")
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(Object.keys(data).length==0){
            throw "veribulunamadi";
        }
        if(Array.isArray(data)){
            var rejectedItems=[];
            for(item of data){
                if(typeof(item)!="object"){
                    throw "veritipihatali";
                }
                var query="";
                query=insertConverter(tableName,databaseName,item);
                if(query==""){
                    throw "sorgubulunamadi";
                }
                var result =await this.query(query,[ [ Object.keys(item).map(y=> item[y]) ] ],false,true,true);
                if(result.data){
                    rejectedItems.push( { title: {colName: result.colName, colData:result.colData, message:result.message },data:result.data[0][0]});
                }
            }
            console.log(rejectedItems);
            this.close();
            return rejectedItems;
            /*  eski toplu insert
                data.map(x=> {
                if(typeof(x)!="object"){
                    throw "veritipihatali";
                }
                var query="";
                query=insertConverter(tableName,databaseName,x);
                if(query==""){
                    throw "sorgubulunamadi";
                }
                return this.query(query,[ [ Object.keys(x).map(y=> x[y]) ] ],false);
            })*/
        }
        else if(typeof(data)=="object"){
            var query="";
            query=insertConverter(tableName,databaseName,data);
            if(query==""){
                throw "sorgubulunamadi";
            }
            return this.query(query,[ [ Object.keys(data).map(y=> data[y]) ] ]);
        }
        else{
            throw "veritipihatali";
        }
       
        return false;
    }
    remove(where={},tableName,mode="AND",databaseName=this.databaseName){
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if( Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        var query="";
        query=removeConverter(tableName,databaseName,where,mode);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
    update(data={},where={},tableName,mode="AND",databaseName=this.databaseName){
        //var a=await new db().update({a:"a",b:"b"},{b:"b"},"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        if(Object.keys(data).length==0){
            throw "veribulunamadi";
        }
        var query="";
        query=updateConverter(tableName,databaseName,data,where,mode);
        if(query==""){
            throw "sorgubulunamadi";
        }
        var arr1=Object.keys(data).map(y=> data[y])
        var arr2=Object.keys(where).map(y=> where[y])
        var concat= arr1.concat(arr2);
        return this.query(query,Object.keys(concat).map(y=> concat[y]));
    }
    selectIn(colName,data=[],tableName,extra="",countRow=false,databaseName=this.databaseName){
        //data [1,2,3,4] şeklinde olmalı
        //var a=await new db().selectIn("id",[1,2],"sayfalar");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if(data.length==0){
            throw "veribulunamadi";
        }
        if(!colName){
            throw "kolonadibulanamadi";
        }
        var query="";
        query=selectInConverter(tableName,databaseName,colName,extra,countRow);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,[data]);
    
    }
    setSilindi(where={},tableName,mode="AND",databaseName=this.databaseName){
        //await new db().setSilindi({a:"azxzcxzxczsol"},"test");
        if(!tableName || tableName==""){
            throw "tabloismibulunamadi";
        }
        if( Object.keys(where).length==0){
            throw "sorgualanieksik";
        }
        var query="";
        query=setSilindiConverter(tableName,databaseName,where,mode);
        if(query==""){
            throw "sorgubulunamadi";
        }
        return this.query(query,Object.keys(where).map(y=> where[y]));
    }
}
function insertConverter(_tableName,_databaseName,_object){
    return `INSERT INTO ${_databaseName}.${_tableName} (${Object.keys(_object).toString()}) VALUES  ?`; 
}
function removeConverter(_tableName,_databaseName,_where,_mode){
    return `DELETE FROM ${_databaseName}.${_tableName} WHERE ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")}`; 
}
function selectQueryConverter(_tableName,_databaseName,_where,_mode,_extra,_countRow){
    return `SELECT ${ _countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${_databaseName}.${_tableName} WHERE ( ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")} ) AND deleted=0 ${_extra} ; ${ _countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
}
function selectLikeConverter(_tableName,_databaseName,_where,_mode,_extra,_countRow){
    return `SELECT ${ _countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${_databaseName}.${_tableName} WHERE ( ${ _where ? Object.keys(_where).map(x=> x+" LIKE ? ").join(_mode+" "):"1=1" } ) AND deleted=0 ${_extra} ; ${ _countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
}
function selectLikeWithColumnConverter(_tableName,_databaseName,_colNameS,_where,_mode){
    return `SELECT ${_colNameS} FROM ${_databaseName}.${_tableName} WHERE ( ${ _where ? Object.keys(_where).map(x=> x+" LIKE ? ").join(_mode+" "):"1=1" } ) AND deleted=0`;
}
function selectWithColumnConverter(_tableName,_databaseName,_colNameS,_where,_mode){
    return `SELECT ${_colNameS} FROM ${_databaseName}.${_tableName} WHERE ( ${ _where ? Object.keys(_where).map(x=> x+"= ? ").join(_mode+" "):"1=1" } ) AND deleted=0`;
}

function updateConverter(_tableName,_databaseName,_object,_where,_mode){
    return `UPDATE ${_databaseName}.${_tableName} SET ${Object.keys(_object).map(x=> x+"= ? ").toString()} WHERE ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")}`;
}
function selectInConverter(_tableName,_databaseName,_colName,_extra,_countRow){
    return `SELECT ${ _countRow ? "SQL_CALC_FOUND_ROWS" : "" } * FROM ${_databaseName}.${_tableName} WHERE ${_colName} IN (?) AND deleted=0 ${_extra} ; ${ _countRow ? "SELECT FOUND_ROWS() AS max;" : "" }`;
}
function setSilindiConverter(_tableName,_databaseName,_where,_mode){
    return `UPDATE ${_databaseName}.${_tableName} SET deleted=1 WHERE ${Object.keys(_where).map(x=> x+"= ? ").join(_mode+" ")}`;
}

module.exports = Database;

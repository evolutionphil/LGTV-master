"use strict";
var mac_address, user_name, password,
    api_host_url, device_key, is_trial,
    panel_urls=["http://dev.bai.com:4000/api"],
    time_difference_with_server=0  // time difference between user time and server time, measured by mins
var expire_date,app_loading=false;
var current_route='login-page';
var default_movie_icon="images/default_icon.png";
var current_movie,
    current_season, current_episode, current_series;
var parent_account_password="0000";
var mac_valid=true;
var playlist_urls=[];
var languages=[], current_words=[], notification={};
var client_offset = moment(new Date()).utcOffset();
var storage_id='DNF3s9SAag_'
var platform='samsung';  // can be samsung or lg.
var samsung_version='1.0.1';
var lg_version='1.0.1',real_time_notification,reseller_id;
var notification_interval;
function showLoader(flag) {
    if(typeof flag=='undefined')
        flag=true;
    if(flag)
        // $('#loader').css({display:'flex'});
        $('#loader').show();
    else
        $('#loader').hide();
}
function saveData(key, data) {
    window[key]=data;
}
function getMovieUrl(stream_id,stream_type,extension) {
    return api_host_url+"/"+stream_type+"/"+user_name+"/"+password+"/"+stream_id+"."+extension;
}
function moveScrollPosition(parent_element, element, direction, to_center) {  // move the scroll bar according to element position
    if(direction==='vertical'){
        var parent_height=parseInt($(parent_element).css('height').replace('px',''));
        var child_position=$(element).position();
        var element_height=parseInt($(element).css('height').replace('px',''));
        var move_amount=0;
        if(!to_center){
            if(child_position.top+element_height>=parent_height)
                move_amount=child_position.top+element_height-parent_height;
            if(child_position.top<0)
                move_amount=child_position.top;
            $(parent_element).animate({ scrollTop: '+='+move_amount}, 10);
        }
        else{   // if element should on top position
            var scroll_amount=child_position.top+element_height/2-parent_height/2;
            $(parent_element).animate({ scrollTop: '+='+scroll_amount}, 10);
        }
        return move_amount;
    }
    else{
        var parent_width=parseInt($(parent_element).css('width').replace('px',''));
        var element_width=parseInt($(element).css('width').replace('px',''));
        var child_position=$(element).position();
        var scroll_amount=0;
        if(!to_center){
            if(child_position.left+element_width>=parent_width)
                scroll_amount=child_position.left+element_width-parent_width;
            if(child_position.left<0)
                scroll_amount=child_position.left;
        }else{

            // if(child_position.left+element_width>=parent_width)
                scroll_amount=child_position.left+element_width/2-parent_width/2;
            // else
            //     scroll_amount=parent_width/2-(child_position.left+element_width/2)
        }
        $(parent_element).animate({ scrollLeft: '+='+(scroll_amount)}, 10);
        return scroll_amount;
    }
}
function showToast(title, text) {
    $('#toast-body').html('<h3>'+title+'<br>'+text+'</h3>')
    $('.toast').toast({animation: true, delay: 2000});
    $('#toast').toast('show')
}
function getMinute(time_string) { // get the minute of time string
    var date=new Date(time_string);
    return parseInt(date.getTime()/60/1000);
}
function parseM3uResponse(type, text_response) {
    var num=0;
    if(type==='type1'){
        var live_categories=[];
        var lives=[];
        var vods=[];
        var vod_categories=[];
        var series_categories=[];
        var series=[];
        text_response=text_response.replace(/['"]+/g, '');
        var temp_arr2=text_response.split(/#EXTINF:-{0,1}[0-9]{1,} {0,},{0,}/gm);
        temp_arr2.splice(0,1);  // remove the first row
        var temp_arr1=[];
        var start_time1=new Date().getTime()/1000;
        if(text_response.includes('tvg-')){  // if general m3u type 1
            var live_category_map={}, vod_category_map={}, series_category_map={};
            for(var i=0;i<temp_arr2.length;i++){
                try{
                    temp_arr1=temp_arr2[i].split("\n");
                    num++;
                    var url=temp_arr1[1].length>1 ? temp_arr1[1] : '';
                    if(!url.includes('http:'))
                        continue;
                    var type="live";
                    if(url.includes("/movie/") || url.includes('vod') || url.includes('=movie') || url.includes('==movie=='))
                        type="vod";
                    if(url.includes("/series/"))
                        type="series";

                    var temp_arr3=temp_arr1[0].trim().split(",");
                    var name=temp_arr3.length>1 ? temp_arr3[1] : '';  // get the name of channel
                    var temp_arr4=splitStrings(temp_arr3[0],['tvg-','channel-','group-']);
                    var result_item={
                        stream_id:"",
                        name:name,
                        stream_icon:"",
                        title:""
                    };
                    var category_name='All';
                    temp_arr4.map(function (sub_item){
                        var sub_item_arr=sub_item.split("=");
                        var key=sub_item_arr[0];
                        var value=sub_item_arr[1];
                        switch (key) {
                            case "id":
                                result_item.stream_id=value;
                                break;
                            case "name":
                                result_item.name=value.trim()!='' ? value : name;
                                break;
                            case "logo":
                                result_item.stream_icon=value;
                                break;
                            case "title":
                                category_name=value.split(",")[0];
                                if (category_name=='')
                                    category_name='Uncategorized';
                                break;
                        }
                    })
                    if(result_item.stream_id.trim()==="")
                        result_item.stream_id=result_item.name;
                    result_item.url=url;
                    result_item.num=num;


                    if(type==="live"){
                        if(typeof live_category_map[category_name]=="undefined"){
                            live_category_map[category_name]=category_name;
                            var category_item={
                                category_id:category_name,
                                category_name:category_name
                            }
                            live_categories.push(category_item);
                        }

                        result_item.category_id=category_name;
                        lives.push(result_item);
                    }

                    if(type==="vod"){
                        if(typeof vod_category_map[category_name]=="undefined"){
                            vod_category_map[category_name]=category_name;
                            var category_item={
                                category_id:category_name,
                                category_name:category_name
                            }
                            vod_categories.push(category_item);
                        }
                        result_item.category_id=category_name;
                        vods.push(result_item);
                    }

                    if(type==="series"){
                        if(typeof series_category_map[category_name]=="undefined"){
                            series_category_map[category_name]=category_name;
                            var category_item={
                                category_id:category_name,
                                category_name:category_name
                            }
                            series_categories.push(category_item);
                        }
                        result_item.category_id=category_name;
                        series.push(result_item);
                    }
                }catch(e){
                    console.log("parsing m3u error "+i, e);
                }
            }
        }
        else{
            live_categories=[
                {
                    category_id:'all',
                    category_name:'All'
                }
            ];
            vod_categories=[
                {
                    category_id:'all',
                    category_name:'All'
                }
            ];
            series_categories=
                [
                    {
                        category_id:'all',
                        category_name:'All'
                    }
                ];
            for(var i=0;i<temp_arr2.length;i++){
                temp_arr1=temp_arr2[i].split("\n");
                try{
                    var name=temp_arr1[0];
                    var url=temp_arr1[1];

                    var type="live";
                    if(url.includes("/movie/"))
                        type="movie";
                    if(url.includes("/series/"))
                        type="series";
                    var result_item={};
                    name=name.trim();
                    result_item.stream_id=name;
                    result_item.name=name;
                    result_item.stream_icon='';
                    result_item.num=i+1;
                    result_item.category_id='all';
                    result_item.url=url;
                    if(type==='live')
                        lives.push(result_item);
                    if(type==='series')
                        series.push(result_item);
                    if(type==='movie')
                        vods.push(result_item);

                }catch(e){
                    console.log(temp_arr1[0]);
                    console.log(e);
                }

            }
        }

        if(live_categories.length>1){
            live_categories.map(function (item) {
                if(item.category_id==='All')
                    item.category_name="Uncategorized"
            })
        }
        if(vod_categories.length>1){
            vod_categories.map(function (item) {
                if(item.category_id==='All')
                    item.category_name="Uncategorized"
            })
        }
        if(series_categories.length>1){
            series_categories.map(function (item) {
                if(item.category_id==='All')
                    item.category_name="Uncategorized"
            })
        }

        LiveModel.setCategories(live_categories)
        LiveModel.setMovies(lives);
        LiveModel.insertMoviesToCategories();

        VodModel.setCategories(vod_categories);
        VodModel.setMovies(vods);
        VodModel.insertMoviesToCategories();

        SeriesModel.setCategories(series_categories);
        var parsed_series=parseSeries(series);
        SeriesModel.setMovies(parsed_series);
        SeriesModel.insertMoviesToCategories();
    }
}
function parseSeries(data) {
    var series=[];
    var series_map={};
    var season_map={}, episodes={};
    data.map(function (item) {
        try{
            var temp_arr1=item.name.split(/ S[0-9]{2}/);
            var season_name=item.name.match(/S[0-9]{2}/)[0];
            season_name=season_name.trim().replace("S","");
            season_name="Season "+season_name;
            var series_name=temp_arr1[0].trim();
            var episode_name=temp_arr1[1].trim().replace("E","");
            if(typeof series_map[series_name]=="undefined"){
                season_map={}, episodes={};  // Initialize for every other series
                episodes[season_name]=[{
                    name:episode_name,
                    url:item.url,
                    id:episode_name,
                    info:{},
                    title:"Episode "+episode_name
                }];
                season_map[season_name]={
                    name:season_name,
                    cover:"images/series-icon.png"
                };
                series_map[series_name]={
                    series_id:series_name,
                    name:series_name,
                    cover:item.stream_icon,
                    youtube_trailer:'',
                    category_id:item.category_id,
                    rating:'',
                    rating_5based:'',
                    genre:'',
                    director:'',
                    cast:'',
                    plot:'',
                    season_map:season_map,
                    episodes:episodes
                }
            }else{
                if(typeof season_map[season_name]=="undefined"){
                    episodes[season_name]=[{
                        name:episode_name,
                        url:item.url,
                        id:episode_name,
                        info:{},
                        title:"Episode "+episode_name
                    }]
                    season_map[season_name]={
                        name:season_name,
                        cover:"images/series-icon.png"
                    }
                    series_map[series_name].season_map=season_map;
                }
                else{
                    episodes[season_name].push({
                        name:season_name,
                        url:item.url,
                        id:season_name,
                        info:{},
                        title:"Episode "+episode_name
                    })
                }
                series_map[series_name].episodes=episodes;
            }
        }catch(e){
            // console.log(e);
        }
    })
    console.log('Here Series Map',series_map);
    var series_num=0;
    Object.keys(series_map).map(function (key) {
        series_num++;
        var item=series_map[key];
        var seasons=[];
        try{
            Object.keys(item.season_map).map(function (key1) {
                seasons.push(item.season_map[key1]);
            })
        }catch(e){
        }
        delete item['season_map']
        item.num=series_num;
        item.seasons=seasons;
        series.push(item);
    })
    return series;
}
function splitStrings(string, keys) {
    var result_array=[];
    for(var i=0;i<keys.length;i++){
        var temp_arr=string.split(keys[i])
        if(i==keys.length-1){
            for(var j=0;j<temp_arr.length;j++){
                if(temp_arr[j].trim()!='')
                    result_array.push(temp_arr[j]);
            }
            return result_array;
        }
        else{
            for(var j=0;j<temp_arr.length;j++){
                if(temp_arr[j].trim()!=''){
                    var temp_arr2=splitStrings(temp_arr[j],keys.slice(i+1));
                    temp_arr2.map(function (item) {
                        if(item.trim()!=='')
                            result_array.push(item);
                    })
                }
            }
            return result_array;
        }
    }
}
function getAtob(text) {
    var result=text;
    try{
        return decodeURIComponent(atob(text).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }catch(e){
    }
    return result;
}
function checkForAdult(item,item_type,categories){
    var is_adult=false;
    var category;
    if(item_type==='movie'){  //
        for(var i=0;i<categories.length;i++) {
            if (item.category_id == categories[i].category_id) {
                category = categories[i];
                break;
            }
        }
    }
    else
        category=item;
    var category_name=category.category_name.toLowerCase();
    if(category_name.includes('xxx') ||  category_name.includes('adult') || category_name.includes('porn'))
        is_adult=true;
    return is_adult;
}
function pickPanelUrl(exclude_indexes) {
    var picked_url, picked_index;
    var urls=[];
    panel_urls.map(function(item,index){
        if(!exclude_indexes.includes(index))
            urls.push(item);
    })
    var rand_number=Math.random();
    var step=1/urls.length;
    for(var i=0;i<urls.length;i++){
        if(rand_number>=i*step && rand_number<=step*(i+1)){
            picked_url=urls[i];
            picked_index=i;
            break;
        }
    }
    return [picked_index,picked_url];
}
function getSortedMovies(movies,key) {
    var new_movies=[];
    var new_key=key;
    if(key==='a_z' || key==='z_a')
        new_key='name';
    if(key==='number')
        new_key='num';
    if(movies.length==0)
        return movies;
    if(typeof movies[0][new_key]=='undefined'){
        return movies;
    }
    var direction=1;
    switch (key) {
        case 'rating':
        case 'number':
        case 'added':
            direction=1;
            if(key==='number')
                direction=-1;
            new_movies=movies.sort(function(a,b){
                var a_new_key=parseFloat(a[new_key]);
                if(isNaN(a_new_key))
                    a_new_key=0;
                var b_new_key=parseFloat(b[new_key])
                if(isNaN(b_new_key))
                    b_new_key=0;
                return direction*(a_new_key<b_new_key ? 1
                    :a_new_key>b_new_key ? -1 : 0);
            })
            break;
        case 'a_z':
        case 'z_a':
        case 'name':
            direction=(key==='a_z' || key==='name') ? 1 : -1;
            new_movies=movies.sort(function(a,b){
                return direction*(a[new_key].localeCompare(b[new_key]));
            })
            break;
        case 'default':
            return movies;
    }
    return new_movies;
}
function parseM3uUrl(){
    var playlist_url=settings.playlist.url;
    if(playlist_url.includes("username=") && playlist_url.includes("password="))
        settings.playlist_type="xtreme";
    else
        settings.playlist_type="type1";
    if(settings.playlist_type==='xtreme'){
        var temp_array1=settings.playlist.url.split("?");
        var temp_array2=temp_array1[1].split('&');
        temp_array2.map(function(item){
            var temps=item.split('=');
            var key=temps[0], value=temps[1];
            if(key.toLowerCase()==='username')
                user_name=value;
            if(key.toLowerCase()==="password")
                password=value;
        })
        api_host_url=temp_array1[0].replace("/get.php","");
    }
    else
        api_host_url=playlist_url;
}
function makeRearrangeArray(array1,source_position, destination_position) {
    var result=[];
    if(source_position>destination_position){
        result=array1.slice(0,destination_position);
        result=result.concat(array1[source_position]);
        result=result.concat(array1.slice(destination_position, source_position));
        result=result.concat(array1.slice(source_position+1));
    }else{
        result=array1.slice(0,source_position);
        result=result.concat(array1.slice(source_position+1, destination_position+1));
        result=result.concat(array1[source_position]);
        result=result.concat(array1.slice(destination_position+1));
    }
    return result;
}
function setSelectionRange(targetElement) {
    setTimeout(function () {
        var tmp = $(targetElement).val();
        $(targetElement)[0].setSelectionRange(tmp.length, tmp.length);
    },200)
}
function exitApp() {
    if(platform==='samsung'){
        tizen.application.getCurrentApplication().exit();
    }else
        window.close();
}

function getEncryptKey(length) {
    var symbols='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    for(var s = ''; s.length < length; s += symbols.charAt(Math.random() * 62 | 0)) ;
    return s;
}
function getEncryptKeyPosition(character) {
    var symbols='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    for(var i=0;i<symbols.length;i++){
        if(symbols[i]==character){
            return i;
        }
    }
}
function getEncryptPositionChar(position) {
    var symbols='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    return symbols.charAt(position);
}
function encryptRequest(data) {
    var encrypt_position=0, encrypt_length_position=1;
    var string_data=JSON.stringify(data);
    string_data=btoa(string_data);
    var encrypt_key_length=parseInt(Math.random()*30);
    if(encrypt_key_length<20)
        encrypt_key_length=20;
    var position=Math.floor(Math.random()*string_data.length);
    if(position>=42)
        position=42;
    var encrypt_key=getEncryptKey(encrypt_key_length);
    var encrypted_data=string_data.slice(0,position).concat(encrypt_key).concat(string_data.slice(position));
    var encrypt_position_char=getEncryptPositionChar(position);
    var encrypt_length_position_char=getEncryptPositionChar(encrypt_key_length);
    encrypted_data=encrypted_data.slice(0,encrypt_position)+encrypt_position_char+encrypted_data.slice(encrypt_position)
    encrypted_data=encrypted_data.slice(0,encrypt_length_position)+encrypt_length_position_char+encrypted_data.slice(encrypt_length_position);
    console.log("encrypt_position_char="+encrypt_position_char, "encrypt_length_position_char="+encrypt_length_position_char);
    return encrypted_data
}
function decryptResponse(data1) {
    var app_type='samsung';
    var encrypt_position=0, encrypt_length_position=1;
    var raw_response = data1.data;
    var enc_pos,enc_len, enc_pos_char, enc_len_char;
    if(app_type!=='android'){
        raw_response=reverseString(raw_response);
        enc_pos_char=raw_response[encrypt_position];
        enc_len_char=raw_response[encrypt_length_position]
        console.log("enc_pos_char="+enc_pos_char, "enc_len_char="+enc_len_char)
        enc_pos=getEncryptKeyPosition(enc_pos_char);
        enc_len=getEncryptKeyPosition(enc_len_char);
        raw_response=raw_response.slice(0, encrypt_length_position)+raw_response.slice(encrypt_length_position+1);
        raw_response=raw_response.slice(0, encrypt_position)+raw_response.slice(encrypt_position+1);
    }
    if(app_type==='android'){
        enc_pos=getEncryptKeyPosition(raw_response[raw_response.length-1]);
        enc_len=getEncryptKeyPosition(raw_response[raw_response.length-2]);
        raw_response=raw_response.slice(0,raw_response.length-2);
    }
    var encode_str=raw_response.slice(0, enc_pos).concat(raw_response.slice(enc_pos+enc_len));
    console.log(encode_str);
    encode_str=getAtob(encode_str);
    console.log(encode_str);
    var data=JSON.parse(encode_str);
    console.log(data);
    return data;
}
function reverseString(str) {
    var splitString = str.split("");
    var reverseArray = splitString.reverse();
    var joinArray = reverseArray.join("");
    return joinArray;
}
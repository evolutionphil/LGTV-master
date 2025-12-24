"use strict";
var settings={
    bg_img_index:0,
    bg_img:'',
    playlist_url_index:null,
    playlist_url:"",
    playlist_type:"xtreme",

    vod_sort:"added", // or a-z, z-a, rating, number
    series_sort:"added",
    live_sort:"default",
    sort_keys:{
        'added':'order_by_added',
        'number':'order_by_number',
        'rating':'order_by_rating',
        'a-z':'sort_a_z',
        'z-a':'sort_z_a'
    },
    language:'en',
    show_featured_movies:'on',
    epg_time_difference:0,

    initFromLocal:function(){
        var that=this;
        var temp=localStorage.getItem(storage_id+'bg_img_index');
        if(temp!=null)
            this.bg_img_index=parseInt(temp);

        temp=localStorage.getItem(storage_id+'playlist_url_index');
        if(temp!=null && temp!=='null')
            this.playlist_url_index=parseInt(temp);

        temp=localStorage.getItem(storage_id+'epg_time_difference');
        if(temp!=null && temp!=='null')
            this.epg_time_difference=parseFloat(temp);

        var keys=['vod_sort','series_sort','live_sort','show_featured_movies','subtitle_size','subtitle_bg_color','subtitle_text_color'];
        keys.map(function (key) {
            temp=localStorage.getItem(storage_id+key);
            if(temp!=null && temp!=='null')
                that[key]=temp;
        })
        

        temp=localStorage.getItem(storage_id+'language');
        if(temp!=null && temp!=='null')
            this.language=temp;
        else{
            if(typeof navigator.language!='undefined'){
                var lang_tmps=navigator.language.split('-');
                this.language=lang_tmps[0];
            }
        }
    },

    saveSettings:function(key, value,type){
        this[key]=value;
        if(type==='object' || type==='array')
            value=JSON.parse(value);
        localStorage.setItem(storage_id+key,value);
    },

    getStorage:function(key, type){
        var result="";
        if(type==='object')
            result={};
        if(type==='array')
            result=[];
        var temp=localStorage.getItem(storage_id+key);
        if(type==='object' || type==='array')
            result=JSON.parse(temp);
        return result;
    },

    getSetting:function(key){
        return this[key];
    },

    resetDefaultValues:function (){
        this.bg_img_index=0;
        this.bg_img='';
        this.playlist_url_index=null;
        this.playlist_url=""
        this.playlist_type="xtreme"
        this.vod_sort="added";
        this.series_sort="added";
        this.live_sort="default";
        this.language='en';
        this.show_featured_movies='on';
        this.epg_time_difference=0;
        // Subtitle settings with defaults
        this.subtitle_size='medium';
        this.subtitle_bg_color='black';
        this.subtitle_text_color='white';
    }
}

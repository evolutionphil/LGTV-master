"use strict";
var SrtOperation={
    current_srt_index:0,
    next_srt_time:0,
    srt:[],
    stopped:false,
    subtitle_shown:false,
    init: function (subtitle, current_time) {  // will set initial time and initial index from parsed subtitle text array
        // we will save always the index and time for current time subtitle text
        $('#'+media_player.parent_id).find('.subtitle-container').html('');
        this.subtitle_shown=false;
        var srt=[];
        if(subtitle.content) {
            try{
                SrtParser.init();
                srt=SrtParser.fromSrt(subtitle.content)
            }catch (e) {
            }
        }
        this.srt=srt;
        if(srt.length>0)
            this.stopped=false;
        else{
            this.stopped=true;
            return;
        }

        this.current_srt_index=this.findIndex(current_time,0,srt.length-1);
        console.log("here found srt index",this.current_srt_index,current_time, srt);
        if(this.current_srt_index<0)
            this.current_srt_index=0;
        this.next_srt_time=0;
    },
    findIndex: function (time,start, end) {  // we will use binary search algorithm here
        if(time==0)
            return 0;

        // Base Condition
        var arr=this.srt;
        if (start > end)
            return end;
        // Find the middle index
        let mid=Math.floor((start + end)/2);

        // Compare mid with given key x
        if (arr[mid].startSeconds<=time && time<arr[mid].endTime)
            return mid;


        // If element at mid is greater than x,
        // search in the left half of mid
        if(arr[mid].startSeconds > time)
            return this.findIndex(time, start, mid-1);
        else
            // If element at mid is smaller than x,
            // search in the right half of mid
            return this.findIndex(time, mid+1, end);
    },
    timeChange:function (current_time) {
        if(this.stopped)
            return;
        var srt_index=this.current_srt_index;
        var srt_item=this.srt[srt_index];
        if(current_time>=srt_item.startSeconds && current_time<srt_item.endSeconds){
            if(!this.subtitle_shown)
                $('#'+media_player.parent_id).find('.subtitle-container').html(srt_item.text)
        }
        else if(current_time>srt_item.endSeconds) {
            var next_srt_item=this.srt[srt_index+1];
            try{
                if(current_time<next_srt_item.startSeconds){
                    if(this.subtitle_shown){
                        $('#'+media_player.parent_id).find('.subtitle-container').html('');
                        this.subtitle_shown=false;
                    }
                }else if(next_srt_item.endSeconds>current_time){
                    $('#'+media_player.parent_id).find('.subtitle-container').html(next_srt_item.text);
                    this.subtitle_shown=true;
                    this.current_srt_index+=1;
                }else   // in this case, have to find the next index;
                {
                    console.log("here finding new srt index");
                    this.current_srt_index=this.findIndex(current_time,0,this.srt.length-1);
                    if(this.current_srt_index<0)
                        this.current_srt_index=0;
                }
            }catch (e) {
                console.log("subtitle timer issue",e);
            }
        }
        else if(current_time<srt_item.startSeconds) {
            try{
                this.current_srt_index=this.findIndex(current_time,0,this.srt.length-1);
                if(this.current_srt_index<0)
                    this.current_srt_index=0;
            }catch (e) {
            }
        }
    },
    stopOperation: function () {
        this.stopped=true;
        $('#'+media_player.parent_id).find('.subtitle-container').html('');
        this.subtitle_shown=false
    },
    deStruct:function () {
        this.srt=[];
        this.stopped=true;
        $('#'+media_player.parent_id).find('.subtitle-container').html('');
    }
}

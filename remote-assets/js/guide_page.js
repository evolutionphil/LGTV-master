"use strict";
var guide_page={
    keys:{
        focused_part:"programme_selection", // program_selection, back_button, full_screen...
    },
    initiated:false,
    right_part_expanded:true,  // if guides part is full screen
    is_full_screen:false,  // represent if video is in full screen mode
    current_category_index:-1,
    current_channel_index:-1,
    current_programme_index:-1,
    hover_category_index:0,
    hover_channel_index:0,
    hover_programme_index:0,
    length_per_minute:0.5,  // represent with %, 1 minute = 1vw
    time_interval:30,
    current_time_differ_width:30,
    category_dom_items:[],
    channel_dom_items:[],
    programme_wrappers:[],
    player:null,
    min_start_time:"",  // the minimum start time of the current movies
    full_screen_timer:null,
    progressbar_timer:null,
    fillCategoryItems:function(){
        var htmlContent='';
        var categories=LiveModel.getCategories(false, true);
        categories.map(function(item,index){
            htmlContent+=
                '<div class="guide-category-item"\
                    onclick="guide_page.changeCategory('+index+')"\
                    onmouseenter="guide_page.hoverCategory('+index+')"\
                >'+
                    item.category_name+
                '</div>'
        })
        $('#guide-categories-container').html(htmlContent);
        this.category_dom_items=$('.guide-category-item');
    },
    toggleExpand:function(){
        this.right_part_expanded=!this.right_part_expanded;
        $('#guide-categories-container').toggleClass('expanded');
        $('#guide-page-right-part').toggleClass('expanded');
    },
    getProgrammeDuration:function(programme){
        var duration=getMinute(programme.stop)-getMinute(programme.start);
        var width=duration*this.length_per_minute;
        return width;
    },
    getMinProgramStartTime:function(movies){  // get the minmum start time of programmes of movies
        var min_start="9999-99-99";
        movies.map(function(movie){
            movie.programmes.map(function(programme){
                if(programme.start!=null && programme.start<min_start){
                    min_start=programme.start;
                }
            })
        })
        return min_start;
    },
    getMaxProgramStopTime:function(movies){  // get the minmum start time of programmes of movies
        var max_stop="0000-00-00";
        movies.map(function(movie){
            movie.programmes.map(function(programme){
                if(programme.stop>max_stop){
                    max_stop=programme.stop;
                }
            })
        })
        return max_stop;
    },

    getTimeGapLength:function(prev_stop_time, current_start_time){ // get the empty time
        return (getMinute(current_start_time)-getMinute(prev_stop_time))*this.length_per_minute;
    },

    changeCategory:function(index){
        if(this.current_category_index!=index){
            this.current_category_index=index;
            $(this.category_dom_items).removeClass('active');
            $(this.category_dom_items[index]).addClass('active');
            this.drawChannelProgrammes(index);
        }
        this.keys.focused_part="programme_selection";
        this.toggleExpand();
    },
    hoverCategory:function(index){
        this.hover_category_index=index;
        $(this.category_dom_items).removeClass('active');
        $('#guide-back-button').addClass('active');
        $(this.channel_dom_items).removeClass('active');
        $(this.category_dom_items[this.hover_category_index]).addClass('active');
        $(this.category_dom_items[this.current_category_index]).addClass('active');
        moveScrollPosition($('#guide-categories-container'),$(this.category_dom_items[this.hover_category_index]),'vertical',false);
    },

    scrollToCurrentTime:function(){
        var current_date=moment();
        var min_start_time=this.min_start_time;
        var min_starttimestamp_minute=moment(min_start_time).unix()/60;  // the minimum start time
        var current_timestamp_minute=current_date.unix()/60;  // current time displayed as minute
        var scorll_left_for_current_time=(current_timestamp_minute-min_starttimestamp_minute-this.current_time_differ_width)*this.length_per_minute;
        if(scorll_left_for_current_time)
            this.proceedScrollLeft(convertVwToPixel(scorll_left_for_current_time),true);
    },

    getScrollLeftPosition:function(){
        var parent_element=this.programme_wrappers[this.hover_channel_index];
        var element=this.getProgrammeElement()
        var scroll_amount=null;
        if(element){  // if there are programmes for current channel
            var padding_left=parseInt($(parent_element).css('padding-left').replace('px',''));
            var parent_width=$(parent_element).width();
            var child_position=$(element).position();
            var element_width=$(element).width();
            var parent_scroll_position_left=$(parent_element).scrollLeft();
            if(parent_scroll_position_left+child_position.left+element_width>=parent_width)
            {
                if(element_width>=parent_width){  // if the width of element is grater than the parent width, will show the element left position
                    scroll_amount=parent_scroll_position_left+child_position.left-50;  // will show at the start postion
                }
                else{
                    // scroll_amount=parent_scroll_position_left+child_position.left+element_width-parent_width+50
                    scroll_amount=parent_scroll_position_left+child_position.left+(element_width-parent_width)/2; // will show at the center position
                }
            }
            if(parent_scroll_position_left+child_position.left-padding_left<0)
            {
                scroll_amount=parent_scroll_position_left+child_position.left-padding_left+50;
            }
        }
        else{
            this.scrollToCurrentTime();
        }
        return scroll_amount;
    },

    addActiveClassToCurrentProgrammes:function(){
        var date=moment().format("Y-MM-DD HH:mm:ss");
        var items=$('.guide-programme-item-wrapper')
        for(var i=0;i<items.length;i++){
            var start_time=$(items[i]).data('start_time');
            var end_time=$(items[i]).data('end_time');
            if(start_time<=date && date<=end_time)
            {
                $(items[i]).addClass('active');
            }
        }
    },

    proceedScrollLeft:function(amount, is_absolute){
        if(is_absolute){
            $(this.programme_wrappers).scrollLeft(amount);
            $('#guide-time-container').scrollLeft(amount);
            var current_time=moment().format('Y-MM-DD HH:mm:ss');
            var time_gap=this.getTimeGapLength(this.min_start_time, current_time); // get by minute, convert into vw
            time_gap=convertVwToPixel(time_gap);  // change into pixel for scroll move event
            var time_bar_position=time_gap-amount;
            $('#current-time-bar').css({left:time_bar_position});
        }
        else{
            $(this.programme_wrappers).scrollLeft(amount);
            $('#guide-time-container').scrollLeft(amount);
        }
    },

    changeHorizontalScroll:function(){
        var scroll_amount=this.getScrollLeftPosition()
        if(scroll_amount!=null)
            this.proceedScrollLeft(scroll_amount,true);
        else
            this.scrollToCurrentTime();
    },

    getCurrentProgramIndex:function(category_index, movie_index){
        var current_time=moment().format('Y-MM-DD HH:mm:ss');
        var current_program_index=0;
        var categories=LiveModel.getCategories(false, true);
        var movie=categories[category_index].movies[movie_index];
        var programmes=movie.programmes;
        for(var i=0;i<programmes.length;i++){
            current_program_index=i;
            if(programmes[i].start<=current_time && current_time<=programmes[i].stop){
                current_program_index=i;
                break;
            }
            if(programmes[i].start>=current_time)
                break;
        }
        this.current_programme_index=current_program_index;
        $('.guide-programme-item-wrapper').removeClass('active');
        var domElement=this.getProgrammeElement();
        if(domElement)
            $(domElement).addClass('active');
    },

    changeCurrentProgramInfo:function(){
        var movie=LiveModel.getCategories(false, true)[this.hover_category_index].movies[this.hover_channel_index];
        $('#guide-channel-icon').attr('src',movie.stream_icon);
        if(typeof movie.programmes[this.current_programme_index]!='undefined'){
            var programme=movie.programmes[this.current_programme_index];
            $('#guide-programme-name').text(programme.title);
            if(typeof programme.desc=="undefined" || typeof programme.desc!="string"){
                $('#guide-programme-description').text('No info');
            }
            else
                $('#guide-programme-description').text(programme.desc);
            var movie_date=moment(programme.start).format('MM-DD-Y');
            $('#guide-programme-date').text(movie_date)
        }
        else{
            $('#guide-programme-name').text("No Info");
            $('#guide-programme-description').text('No info');
            var movie_date=moment().format('MM-DD-Y');
            $('#guide-programme-date').text(movie_date)
        }
        $('#guide-screen-channel-logo').attr('src',movie.stream_icon);
    },
    getProgrammeElement:function(){
        var domElement=null;
        if(this.current_programme_index>=0){
            var programmes=$(this.programme_wrappers[this.hover_channel_index]).find('.guide-programme-item-wrapper');
            domElement=programmes[this.current_programme_index];
        }
        return domElement;
    },
    drawChannelProgrammes:function(category_index){
        $('#guide-channels-container').scrollTop(0);
        $('#guide-programmes-container').scrollTop(0);
        var movies=LiveModel.getCategories(false, true)[category_index].movies;
        var min_start_time=this.getMinProgramStartTime(movies); // minimum start time of current movies
        this.min_start_time=min_start_time;
        var max_stop_time=this.getMaxProgramStopTime(movies);
        var htmlContent="", htmlChannelsContent="";
        var prev_stop_time;
        var time_gap;
        var that=this;
        movies.map(function(movie,movie_index){
            htmlChannelsContent+=
                '<div class="guide-channel-item-wrapper"\
                    onmouseenter="guide_page.hoverChannelItem('+movie_index+')"\
                    onclick="guide_page.handleMenuClick()"\
                >\
                    <span class="guide-channel-number">'+movie.num+'</span>\
                    <img class="guide-channel-icon" src="'+movie.stream_icon+'" onerror="this.src=\'images/default_icon.jpeg\'">'+
                    movie.name+
                '</div>'
            var programmes=movie.programmes;
            prev_stop_time=min_start_time;  // have to subtract -15 mins, i.e time_interval/2
            // prev_stop_time=moment(min_start_time).add('minutes',this.time_interval/2).format('Y-MM-DD HH:mm:ss');
            if(programmes.length==0){
                htmlContent+=
                    '<div class="guide-programme-wrapper empty"></div>'
            }
            else{
                htmlContent+='<div class="guide-programme-wrapper">';
                programmes.map(function(programme, programme_index){
                    time_gap=that.getTimeGapLength(prev_stop_time, programme.start);
                    var width=that.getProgrammeDuration(programme);
                    htmlContent+=
                        '<div class="guide-programme-item-wrapper"\
                            data-programme_index="'+programme_index+'" data-start_time="'+programme.start+'"\
                            data-end_time="'+programme.stop+'"\
                            style="width:'+width+'vw; margin-left:'+time_gap+'vw"\
                            onmouseenter="guide_page.hoverProgramme('+movie_index+','+programme_index+')"\
                            onclick="guide_page.handleMenuClick()"\
                        >'+
                            programme.title+
                        '</div>'
                    prev_stop_time=programme.stop;
                })
                htmlContent+='<div style="width:25000vw"></div>'
                htmlContent+='</div>';
            }
        })
        $('#guide-channels-container').html(htmlChannelsContent);
        $('#guide-programmes-container').html(htmlContent);
        this.channel_dom_items=$('.guide-channel-item-wrapper');
        this.programme_wrappers=$('.guide-programme-wrapper');
        this.current_channel_index=0;
        this.hover_channel_index=0;

        $(this.channel_dom_items[0]).addClass('active');

         // Adding Time Spans
        var min_start_minute=getMinute(min_start_time);
        var max_stop_minute=getMinute(max_stop_time);
        var date_obj=moment(min_start_time);

        var start_time_differ=0;
        var start_time_minute=parseInt(date_obj.format('mm'));
        if(start_time_minute % this.time_interval!=0){
            if(start_time_minute<this.time_interval)
                start_time_differ=this.time_interval-start_time_minute;
            else
                start_time_differ=60-start_time_minute;
        }
        min_start_minute+=start_time_differ;
        date_obj.add('minutes',start_time_differ);
        var htmlTimeElement="";
        var loop_index=0;
        while(min_start_minute<=max_stop_minute){
            var time_string=date_obj.format('hh:mm A');
            var left_margin=0;
            if(loop_index==0)
            {
                left_margin=(start_time_differ-this.time_interval/2)*this.length_per_minute;
            }
            htmlTimeElement+=
                '<div class="guide-time inline-block" style="width:'+(this.time_interval*this.length_per_minute)+'vw; margin-left:'+left_margin+'vw;">'+
                    time_string+
                '</div>'
            min_start_minute+=this.time_interval;
            date_obj.add('minutes',this.time_interval);
            loop_index++;
        }
        $('#guide-time-container').html(htmlTimeElement);

    //   Moving to Current Time
        this.getCurrentProgramIndex(this.current_category_index, this.hover_channel_index);
        this.scrollToCurrentTime();
        this.changeCurrentProgramInfo();
        // this.addActiveClassToCurrentProgrammes();
    },

    hoverProgramme:function(movie_index, programme_index){
        this.hover_channel_index=movie_index;
        $(this.channel_dom_items).removeClass('active');
        $(this.channel_dom_items[this.hover_channel_index]).addClass('active');
        this.current_programme_index=programme_index;
        // Vertical scroll move
        moveScrollPosition($('#guide-channels-container'),$(this.channel_dom_items[this.hover_channel_index]),'vertical',false);  //move channel scroll bar
        $('.guide-programme-item-wrapper').removeClass('active');
        var dom=this.getProgrammeElement();
        if(dom)
            $(dom).addClass('active');
        this.changeHorizontalScroll()
        this.changeCurrentProgramInfo();
    },
    hoverBackButton:function(){
        var keys=this.keys;
        keys.focused_part="back_selection";
        $('#guide-back-button').addClass('active');
        $(this.category_dom_items).removeClass('active');
        $(this.channel_dom_items).removeClass('active');
    },
    hoverChannelItem:function(index){
        if(index!=this.current_channel_index){
            this.keys.focused_part="programme_selection";
            this.hover_channel_index=index;
            $('#guide-back-button').removeClass('active');
            $(this.channel_dom_items).removeClass('active');
            $(this.channel_dom_items[this.hover_channel_index]).addClass('active');
            // Vertical scroll move
            moveScrollPosition($('#guide-channels-container'),$(this.channel_dom_items[this.hover_channel_index]),'vertical',false);  //move channel scroll bar
            moveScrollPosition($('#guide-programmes-container'),$(this.programme_wrappers[this.hover_channel_index]),'vertical',false);  // move channel programme wrapper
            // Horizontal Scroll move
            this.getCurrentProgramIndex(this.current_category_index,this.hover_channel_index);  // get current programme index and add active class.
            $('.guide-programme-item-wrapper').removeClass('active');
            $(this.programme_wrappers).css({'border':'none'})
            var dom=this.getProgrammeElement();
            if(dom)
                $(dom).addClass('active');
            this.changeHorizontalScroll();
            this.changeCurrentProgramInfo();
            this.right_part_expanded=false;
            $('#guide-categories-container').removeClass('expanded');
            $('#guide-page-right-part').addClass('expanded');
            // this.addActiveClassToCurrentProgrammes();
        }
    },

    init:function(){
        this.fillCategoryItems();
        var categories=LiveModel.getCategories(false, true);
        for(var i=0;i<categories.length;i++){
            if(categories[i].movies.length>0){
                this.current_category_index=i;
                this.hover_category_index=i;
                break;
            }
        }
        $(this.category_dom_items[this.hover_category_index]).addClass('active');
        this.keys.focused_part="programme_selection";
        this.drawChannelProgrammes(this.current_category_index);

        media_player.init("guide-page-video","guide-page");
        setTimeout(function(){
            try{
                media_player.setDisplayArea();
            }catch(e){
                console.log(e);
            }
        }, 250);
        this.showChannelVideo();
        this.initiated=true;
    },

    showChannelInformation:function(){
        var movie=LiveModel.getCategories(false, true)[this.current_category_index].movies[this.current_channel_index];
        var programmes=movie.programmes;
        var current_programme=null;
        var current_programme_index=-1;
        var progress_bar_element=$('#guide-video-information-progress').find('span')[0];

        var current_time=moment().format('Y-MM-DD HH:mm:ss');
        for(var i=0;i<programmes.length;i++){
            if(programmes[i].start<=current_time && current_time<=programmes[i].stop){
                current_programme=programmes[i];
                current_programme_index=i;
                break;
            }
        }
        if(current_programme!=null){
            var time_length=(new Date(current_programme.stop)).getTime()-(new Date(current_programme.start)).getTime();
            var current_time=(new Date()).getTime();
            var percentage=(current_time-(new Date(current_programme.start).getTime()))*100/time_length;
            $(progress_bar_element).css({width:percentage+'%'});
            var next_program='No Information';
            $('#guide-video-current-program').text(current_programme.title);
            $('#guide-video-program-name').text(current_programme.title);

            if(typeof programmes[current_programme_index+1]!="undefined" && current_programme_index!=-1)
                next_program=programmes[1].title;
            $('#guide-video-next-program').text(next_program);

            if(typeof current_programme['desc']!="undefined" || typeof current_programme['desc']=="string")
                $("#guide-video-program-description").text(current_programme['desc'])
            else
                $("#guide-video-program-description").text("No Information")
        }
        else{
            $('#guide-video-current-program').text("No Information");
            $('#guide-video-program-name').text("No Information");
            $('#guide-video-next-program').text("No Information");
            $("#guide-video-program-description").text("No Information")
            $(progress_bar_element).css({width:0});
        }
        $('#guide-video-channel-name').html(
            '<span class="channel-name">'+movie.num+' : '+movie.name+'</span>'+
            '<span style="font-size:20px; font-weight: normal;width: 80%;display: inline-block;vertical-align: middle;text-align: right">'+getTodayDate('MM/DD, ddd, Y')+'</span>'
        );
    },

    showChannelVideo:function(){
        var movie=LiveModel.getCategories(false, true)[this.current_category_index].movies[this.current_channel_index];
        var url;
        if(settings.playlist_type==="xtreme")
            url=getMovieUrl(movie.stream_id,'live','ts');
        else
            url=movie.url;
        try{
            media_player.close();
        }catch(e){

        }
        media_player.init("guide-page-video","guide-page");
        media_player.play(url);
        this.showChannelInformation();
        clearInterval(this.progressbar_timer);
        var that=this;
        this.progressbar_timer=setInterval(function(){
            that.showChannelInformation();
        },60000);
    },
    zoomInOut:function(){
        if(this.is_full_screen){  // if already full screen, need to make it small screen
            $('#guide-page').find('.player-container').css({
                position:'fixed',
                right:0,
                top:0,
                height:'30vh',
                width:'30vw'
            });
            media_player.full_screen_state=0;
            $('#guide-video-information-wrapper').slideUp();
            clearTimeout(this.full_screen_timer);
            this.keys.focused_part="programme_selection";
        }
        else{  // make it full screen
            $('#guide-page').find('.player-container').css({
                position:'fixed',
                right:0,
                top:0,
                height:'100vh',
                width:'100vw'
            });
            media_player.full_screen_state=1;
            this.keys.focused_part="full_screen_part";
            $('#guide-video-information-wrapper').slideDown();
            clearTimeout(this.full_screen_timer);
            this.full_screen_timer=setTimeout(function(){
                $('#guide-video-information-wrapper').slideUp();
            },5000);
        }
        this.is_full_screen=!this.is_full_screen;
        setTimeout(function () {
            try{
                media_player.setDisplayArea();
            }catch (e) {
                console.log('setDisplayArea error on guide zoom:', e);
            }
        }, 250);
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="category_selection"){  // if key focus on category part
            this.hover_category_index+=increment;
            if(this.hover_category_index>=this.category_dom_items.length)
                this.hover_category_index=this.category_dom_items.length-1;
            if(this.hover_category_index<0)
                this.hover_category_index=0;
            $(this.category_dom_items).removeClass('active');
            $(this.category_dom_items[this.hover_category_index]).addClass('active');
            $(this.category_dom_items[this.current_category_index]).addClass('active');
            moveScrollPosition($('#guide-categories-container'),$(this.category_dom_items[this.hover_category_index]),'vertical',false);
        }
        if(keys.focused_part==="programme_selection"){ // if key focus on programme selection
            this.hover_channel_index+=increment;
            if(this.hover_channel_index<0){
                this.hover_channel_index=0;
            }
            if(this.hover_channel_index>=this.channel_dom_items.length){
                this.hover_channel_index=this.channel_dom_items.length-1;
            }
            $(this.channel_dom_items).removeClass('active');
            $(this.channel_dom_items[this.hover_channel_index]).addClass('active');

            // Vertical scroll move
            moveScrollPosition($('#guide-channels-container'),$(this.channel_dom_items[this.hover_channel_index]),'vertical',false);  //move channel scroll bar
            moveScrollPosition($('#guide-programmes-container'),$(this.programme_wrappers[this.hover_channel_index]),'vertical',false);  // move channel programme wrapper

            // Horizontal Scroll move
            this.getCurrentProgramIndex(this.current_category_index,this.hover_channel_index);  // get current programme index and add active class.
            $('.guide-programme-item-wrapper').removeClass('active');
            $(this.programme_wrappers).css({'border':'none'})
            var dom=this.getProgrammeElement();
            if(dom)
                $(dom).addClass('active');
            this.changeHorizontalScroll();
            this.changeCurrentProgramInfo();
            // this.addActiveClassToCurrentProgrammes();
        }
    },
    handleMenuLeftRight:function(increment){
       var keys=this.keys;
       if(!this.right_part_expanded){  // not able to handle programmes
           keys.focused_part=keys.focused_part==="back_selection" ? "category_selection" : "back_selection";
           if(keys.focused_part==="back_selection"){
               $('#guide-back-button').addClass('active');
               $(this.category_dom_items).removeClass('active');
           }
           else{
               $('#guide-back-button').removeClass('active');
               $(this.category_dom_items[this.current_category_index]).addClass('active');
           }
       }
       else{  // only handle programmes part
           if(this.current_programme_index>=0){  // if -1, it means, no programmes for current channel
               var programmes=LiveModel.getCategories(false, true)[this.current_category_index].movies[this.hover_channel_index].programmes;
               this.current_programme_index+=increment;
               if(this.current_programme_index<0){
                   this.current_programme_index=0;
                   return;
               }
               if(this.current_programme_index>=programmes.length)
               {
                   this.current_programme_index=programmes.length-1;
                   return;
               }
               $('.guide-programme-item-wrapper').removeClass('active');
               var dom=this.getProgrammeElement();
               if(dom)
                   $(dom).addClass('active');
               this.changeHorizontalScroll()
               this.changeCurrentProgramInfo();
           }
           // this.addActiveClassToCurrentProgrammes();
       }
    },
    handleMenuClick:function(){
        if(this.keys.focused_part==="category_selection"){
            $(this.category_dom_items[this.hover_category_index]).trigger('click');
            return;
        }
        else if(this.keys.focused_part==="back_selection")
            this.goBack();
        else if(this.keys.focused_part==="programme_selection"){
            if(this.hover_channel_index!=this.current_channel_index){
                this.current_channel_index=this.hover_channel_index;
                this.showChannelVideo();
            }
            else{  // if hover channel is same as current channel, show it with full screen
                if(!this.is_full_screen)
                    this.zoomInOut();
            }
        }
        else if(this.keys.focused_part==="full_screen_part"){
            this.keys.focused_part="programme_selection";
            this.zoomInOut();
        }
    },

    goBack:function(){
        if(!this.right_part_expanded){
            this.Exit();
            home_page.reEnter();
        }
        else{
            this.toggleExpand();
            this.keys.focused_part="category_selection";
            $(this.category_dom_items[this.current_category_index]).addClass('active');
        }
    },
    Exit:function(){
        media_player.close();
        $('#guide-page').hide();
    },
    HandleKey:function (e) {
        switch (e.keyCode) {
            case tvKey.RETURN:
                if(this.is_full_screen){
                    this.zoomInOut();
                }
                else{
                    this.goBack();
                }
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1)
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.BLUE:
                this.Exit();
                goHomePageWithMovieType("movies");
                break;
        }
    },

}




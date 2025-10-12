"use strict";
var channel_page={
    current_channel_id:0,
    hover_channel_id:0,
    full_screen_video:false,
    full_screen_timer:null,
    transitioning_to_fullscreen:false,
    progressbar_timer:null,
    player:null,
    channel_number_timer:null,
    next_channel_timer:null,
    channel_num:0,
    keys:{
        focused_part:"channel_selection",//"right_screen_part", search_selection
        channel_selection:0,
        search_back_selection:0,
        right_screen_part:0,  // in small screen state, add favourite or catch button key index
        search_selection:-1,
        operation_modal:0,
    },
    menu_items:[],
    search_movie_items:[],
    is_drawing:false,

    channel_action_items:$('.channel-action-btn'),
    search_back_buttons:$('#channel-page .search-back-button'),
    channel_operation_items:$('.channel-operation-item'),
    channel_epg_timer:null,
    programmes:[],
    prev_dom:null,
    channel_hover_timer:null,
    channel_hover_timeout:300,
    short_epg_limit_count:30,
    active_channel_dom:null,
    rearrange_mode:false,
    rearrange_timer:null,
    rearrange_timeout:300,
    rearrange_origin_position:0,
    removed_favourite_ids:[],
    ui_lock_until: 0,
    display_area_timeout: null,
    
    lockUI: function(ms) {
        ms = ms || 800;
        this.ui_lock_until = Date.now() + ms;
        console.log('🔒 UI LOCKED for ' + ms + 'ms until:', this.ui_lock_until);
    },
    
    uiLocked: function() {
        var locked = Date.now() < this.ui_lock_until;
        if (locked) {
            console.log('🔒 UI is LOCKED, remaining:', this.ui_lock_until - Date.now(), 'ms');
        }
        return locked;
    },
    
    scheduleSetDisplayArea: function(callback, delay) {
        delay = delay || 250;
        console.log('📅 scheduleSetDisplayArea: delay=' + delay + 'ms, clearing previous timeout');
        if (this.display_area_timeout) {
            clearTimeout(this.display_area_timeout);
            console.log('  ⚠️ CANCELLED previous setDisplayArea timeout');
        }
        var that = this;
        this.display_area_timeout = setTimeout(function() {
            console.log('⏰ scheduleSetDisplayArea: timeout fired, executing callback');
            that.display_area_timeout = null;
            try {
                if (callback) callback();
            } catch (e) {
                console.log('❌ setDisplayArea error:', e);
            }
        }, delay);
    },
    init:function (channel_id, full_screen) {
        console.log('╔══════════════════════════════════════════════════════════════════╗');
        console.log('║ CHANNEL_OPERATION.INIT() - ENTERING CATEGORY');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log('  channel_id:', channel_id);
        console.log('  full_screen param:', full_screen);
        console.log('  CURRENT STATE:');
        console.log('    - full_screen_video:', this.full_screen_video);
        console.log('    - transitioning_to_fullscreen:', this.transitioning_to_fullscreen);
        console.log('    - media_player.full_screen_state:', media_player.full_screen_state);
        console.log('    - keys.focused_part:', this.keys.focused_part);
        console.log('    - current_channel_id:', this.current_channel_id);
        console.log('  RESETTING STATE for new category...');
        console.log('╚══════════════════════════════════════════════════════════════════╝');
        
        this.is_drawing=false;
        $("#channel-page").show();
        var category=current_category;

        $('.bottom-label-item').hide();
        if(category.category_id==='recent' || category.category_id==='favourite')
            $('.bottom-label-item.'+category.category_id).show();

        this.rearrange_mode=false;
        if(category.category_id=='favourite')
            this.movies=category.movies;
        else
            this.movies=getSortedMovies(category.movies,settings.live_sort);

        // Filter blocked channels if hide_blocked_content is enabled
        var hideBlocked = localStorage.getItem('hide_blocked_content') === 'true';
        if(hideBlocked) {
            this.movies = this.movies.filter(function(movie) {
                return !isContentBlocked(movie.name, 'channel');
            });
            console.log('🔒 Filtered blocked channels, remaining:', this.movies.length);
        }

        this.removed_favourite_ids=[];
        
        var that=this;
        var htmlContents='';
        
        // Check if all channels are blocked - show empty state
        if(this.movies.length === 0) {
            console.log('⚠️ No channels available after filtering');
            htmlContents='<div class="empty-movie-text">No channels available in this category</div>';
            $('#channel-menu-wrapper').html(htmlContents);
            this.menu_items=[];
            
            // Reset all channel state to prevent stale references
            this.current_channel_id=null;
            this.hover_channel_id=null;
            this.keys.channel_selection=-1;
            
            // Still need to set up basic state even when empty
            $('#live_channels_home .player-container').css({
                position:'relative',
                height:'58.3vh',
                width:'58.3vw'
            });
            media_player.full_screen_state=0;
            this.full_screen_video=false;
            this.keys.focused_part="channel_selection";
            $('#live-channel-button-container').show();
            $('#live_channels_home').find('.channel-information-container').show();
            $('#live_channels_home').find('.video-skin').show();
            $('#live-channel-category-name').html(category.category_name)
            current_route="channel-page";
            return;
        }
        
        current_movie=this.movies[0];
        var stream_channel_index=0;
        if(channel_id!=0){
            current_movie=getCurrentMovieFromId(channel_id,this.movies,'stream_id');
            this.movies.map(function(movie,index){
                if(movie.stream_id==channel_id)
                    stream_channel_index=index;
            })
        }
        this.movies.map(function(movie, index){
            htmlContents+=
                '<div class="channel-menu-item" data-channel_id="'+movie.stream_id+'"\
                    data-index="'+index+'"\
                    onmouseenter="channel_page.hoverMenuItem('+index+')"\
                    onclick="channel_page.channelItemClick('+index+')"\
                >\
                    <span class="channel-number">'+movie.num+'</span>\
                    <img class="channel-icon" src="'+movie.stream_icon+'" onerror="this.src=default_movie_icon;">\
                    <span class="channel-name">'+movie.name+'</span>'+
                    (LiveModel.favourite_ids.includes(movie.stream_id) ? '<i class="fa fa-star favourite-icon"></i>' : '')+
                    '<i class="fa fa-sort sort-icon"></i>\
                </div>'
        })
        $('#channel-menu-wrapper').html(htmlContents);
        var channel_menus=$('#channel-menu-wrapper').find('.channel-menu-item');
        this.menu_items=channel_menus;
        this.hoverMenuItem(stream_channel_index);
        if(full_screen){   // make video wrapper as full width and height
            $('#live_channels_home').find('.player-container').css({
                position:'fixed',
                left:0,
                top:0,
                height:'100vh',
                width:'100vw'
            });
            media_player.full_screen_state=1;
            setTimeout(function () {
                try{
                    media_player.setDisplayArea();
                }catch (e) {
                    console.log('setDisplayArea error on zoom in:', e);
                }
            }, 250);
            that.full_screen_video=true;
            clearTimeout(that.full_screen_timer);
            $('#full-screen-information').addClass('visible');
            $('#full-screen-channel-name').slideDown(400);
            $('#live-channel-button-container').hide();
            that.full_screen_timer=setTimeout(function(){
                $('#full-screen-information').removeClass('visible');
                $('#full-screen-channel-name').slideUp(400);
            },5000)
            that.keys.focused_part="full_screen";
        }
        else{
            $('#live_channels_home .player-container').css({
                position:'relative',
                height:'58.3vh',
                width:'58.3vw'
            });
            media_player.full_screen_state=0;
            that.full_screen_video=false;
            that.keys.focused_part="channel_selection";
            $('#live-channel-button-container').show();
            $('#live_channels_home').find('.channel-information-container').show();
            $('#live_channels_home').find('.video-skin').show();
        }
        this.current_channel_id=current_movie.stream_id;
        this.hover_channel_id=current_movie.stream_id;
        $('#live-channel-category-name').html(category.category_name)
        this.changeFavouriteButton(channel_menus[stream_channel_index]);  // apply favourite character on first channel
        this.showLiveChannelMovie(current_movie.stream_id);
        this.changeActiveChannel();
        current_route="channel-page";
    },
    toggleFavoriteAndRecentBottomOptionVisbility: function () {
        var category = current_category;

        if (this.full_screen_video === false || media_player.full_screen_state === false) {
            if (category.category_id === 'recent' || category.category_id === 'favourite') {
                $('.bottom-label-item.' + category.category_id).show();
            }
        } else {
            if (category.category_id === 'recent' || category.category_id === 'favourite') {
                $('.bottom-label-item.' + category.category_id).hide();
            }
        }
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "full_screen":
                this.keys.focused_part="channel_selection";
                this.full_screen_video=false;
                this.zoomInOut();
                break;
            case "channel_selection":
            case "right_screen_part":
            case "search_back_selection":
                this.Exit();
                current_category={};
                home_page.reEnter();
                break;
            case "search_selection":
                this.removeSearchResult();
                break;
            case "operation_modal":
                $('#channel-operation-modal').modal('hide');
                this.hoverMenuItem(keys.channel_selection);
                break;
        }
    },
    Exit:function () {
        try{
            media_player.stop();
        }
        catch(e){
            console.log(e);
        }
        var keys=this.keys;
        keys.right_screen_part=0;
        keys.focused_part="channel_selection"; // focus will go to menu part
        this.full_screen_video=false;
        this.zoomInOut();
        $("#channel-page").hide();
        clearInterval(this.progressbar_timer);
        clearTimeout(this.full_screen_timer);
        $('#next-program-container').html('');
        $(this.prev_dom).removeClass('active');
        this.prev_dom=null;
        this.reArrangeFavouriteChannelPositions();
    },

    goChannelNum:function(new_value){
        var channel_num=this.channel_num;
        if(channel_num!=0 ||(channel_num==0 && new_value!=0)){
            channel_num=channel_num*10+new_value;
            this.channel_num=channel_num;
            clearTimeout(this.channel_number_timer);
            var that=this;
            $('#typed-channel-number').text(channel_num);
            this.channel_number_timer=setTimeout(function(){  // go to channel number
                var movies=this.movies;
                var movie_exist=false;
                for(var i=0;i<movies.length;i++){
                    if(movies[i].num===that.channel_num){
                        movie_exist=true;
                        current_movie=movies[i];
                        that.showLiveChannelMovie(current_movie.stream_id)
                        that.current_channel_id=current_movie.stream_id;
                        that.hover_channel_id=current_movie.stream_id;
                        that.hoverMenuItem(i);
                        if(that.full_screen_video){
                            $('#full-screen-information').slideDown(400);
                            $('#full-screen-channel-name').slideDown(400);
                            that.full_screen_timer=setTimeout(function(){
                                $('#full-screen-information').slideUp(400);
                                $('#full-screen-channel-name').slideUp(400);
                            },5000)
                            that.keys.focused_part="full_screen";
                        }
                        that.changeActiveChannel();
                        break;
                    }
                }
                if(!movie_exist){
                    showToast("Sorry","Channel does not exist");
                }
                that.channel_num=0;
                $('#typed-channel-number').text("");
            },2000);
        }
    },
    reEnter:function(){
        $("#channel-page").show();
        this.keys.focused_part="channel_selection";
        current_route="channel-page";
        var that=this;
        setTimeout(function(){
            that.showLiveChannelMovie(that.current_channel_id)
            },500
        )
    },
    showOperationModal:function () {
        $('#channel-operation-modal').modal('show');
        this.keys.focused_part="operation_modal";
        this.keys.operation_modal=0;
        var operation_menus=$('#channel-operation-modal').find('.modal-operation-menu-type-1');
        $(operation_menus).removeClass('active');
        $(operation_menus[0]).addClass('active');
    },
    channelItemClick:function(index){
        var menus=this.menu_items;
        var stream_id=$(menus[index]).data('channel_id');
        var movie_info = getCurrentMovieFromId(stream_id, this.movies,'stream_id');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│ channelItemClick');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('  Selected Channel:', movie_info ? movie_info.name : 'UNKNOWN');
        console.log('  stream_id:', stream_id);
        console.log('  current_channel_id:', this.current_channel_id);
        console.log('  full_screen_video:', this.full_screen_video);
        console.log('└─────────────────────────────────────────────────────────┘');
        
        if(this.current_channel_id==stream_id){
            console.log('channelItemClick: SAME CHANNEL - checking if should zoom');
            if(!this.full_screen_video){
                console.log('channelItemClick: Not fullscreen - ZOOMING IN');
                this.keys.focused_part = "full_screen";
                this.full_screen_video=true;
                this.transitioning_to_fullscreen=true;
                this.lockUI(800);
                this.zoomInOut();
            } else {
                console.log('channelItemClick: Already fullscreen - doing nothing');
            }
        }
        else{
            console.log('channelItemClick: DIFFERENT CHANNEL - showing new channel, full_screen_state before=', media_player.full_screen_state);
            this.showLiveChannelMovie(stream_id);
            this.changeActiveChannel();
        }
    },
    goToMainPage:function(){
        this.Exit();
        home_page.reEnter();
    },
    catchUpChannel:function(){
        var movie=getCurrentMovieFromId(this.hover_channel_id, this.movies,'stream_id');
        var that=this;
        var programmes=[];
        if(settings.playlist_type==='xtreme'){
            var format_text='Y-MM-DD HH:mm';
            var epg_offset_minute=settings.epg_time_difference*60;
            $.ajax({
                method:'get',
                url:api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_simple_data_table&stream_id='+movie.stream_id,
                success:function (data) {
                    data.epg_listings.map(function (item) {
                        programmes.push({
                            start:getLocalChannelTime(item.start,epg_offset_minute).format(format_text),
                            stop:getLocalChannelTime(item.end,epg_offset_minute).format(format_text),
                            title:item.title,
                            description:item.description
                        })
                    })
                    if(programmes.length>0){
                        try{
                            media_player.stop();
                        }
                        catch(e){
                            console.log(e);
                        }
                        that.full_screen_video=false;
                        that.zoomInOut();
                        $("#channel-page").hide();
                        catchup_page.init(movie, programmes);
                    }else{
                        showToast("Sorry","No EPG available");
                    }
                },
                error:function (data) {
                    showToast("Sorry","No EPG available");
                }
            });
        }else{
            showToast("Sorry","No EPG available");
        }
    },
    addOrRemoveFav:function(){
        var current_movie=getItemFromId(this.hover_channel_id,"stream_id",this.movies);
        var action='add';
        var favourite_ids=LiveModel.favourite_ids;
        if(favourite_ids.includes(current_movie.stream_id))
            action='remove';
        var elements=[$('#channel-operation-menu-remove-fav'),$('#live-channel-favourite-button')];
        if(action==='add'){
            LiveModel.addRecentOrFavouriteMovie(current_movie,'favourite');  // add to favourite movie
            elements[0].text("Remove Fav");
            elements[0].data('action','remove');
            elements[1].text("Remove Fav");
            elements[1].data('action','remove');
        }
        else{
            elements[0].text("Add Fav");
            elements[0].data('action','add');
            elements[1].text("Add Fav");
            elements[1].data('action','add');
            LiveModel.removeRecentOrFavouriteMovie(this.hover_channel_id,'favourite');
            if(current_category.category_id==='favourite'){
                var menus=$('#channel-menu-wrapper .channel-menu-item');
                var keys=this.keys;
                var current_element=menus[keys.channel_selection];
                $(current_element).remove();
                menus=$('#channel-menu-wrapper .channel-menu-item');
                if(menus.length==0){
                    keys.channel_selection=0;
                    this.hoverSearchBackItems(0);
                }else{
                    if(keys.channel_selection>=menus.length)
                        keys.channel_selection=menus.length-1;
                    this.hover_channel_id=$(menus[keys.channel_selection]).data('channel_id');
                    this.changeFavouriteButton($(menus[keys.channel_selection]));
                    this.hoverMenuItem(keys.channel_selection);
                }
            }
            this.removed_favourite_ids.push(this.hover_channel_id);
        }
    },
    addFavouriteIconToChannelMenu:function(movie_id, operation_type) {
        var menu_items=$('.channel-menu-item');
        menu_items.map(function(index, item){
            var channel_id=$(item).data('channel_id');
            if(channel_id==movie_id){
                if(operation_type==='add')
                    $(item).append('<i class="fa fa-star favourite-icon"></i>')
                else
                    $(item).find('.favourite-icon').remove();
            }
        })
    },
    changeFavouriteButton:function(current_menu){
        var movie_id=$(current_menu).data('channel_id');
        var movie=getCurrentMovieFromId(movie_id,this.movies,'stream_id');
        var action_buttons=[$('.channel-action-btn')[2],$('#channel-operation-modal').find('.modal-operation-menu-type-1')[0]];
        if(movie!=null){
            if(!LiveModel.favourite_ids.includes(movie.stream_id)){
                $(action_buttons).text("Add Fav");
                $(action_buttons).data('action','add');
            }else{
                $(action_buttons).text("Remove Fav");
                $(action_buttons).data('action','remove');
            }
        }
    },
    showNextProgrammes:function (){
        var id='next-program-container';
        var movie=this.movies[this.keys.channel_selection];
        $('#channel-title').text(movie.name);
        var temp=LiveModel.getNextProgrammes(this.programmes);
        var current_program_exist=temp.current_program_exist;
        var programmes=temp.programmes;
        var k=0;
        var htmlContent='';
        for(var i=0;i<programmes.length;i++){
            htmlContent+=
                '<div class="next-program-item '+(k==0 && current_program_exist ? 'current' : '')+'">'+
                '<span class="program-time">'+
                programmes[i].start.substring(11)+' ~ '+programmes[i].stop.substring(11)+
                '</span>'+getAtob(programmes[i].title)+
                '</div>'
            k++;
            if(k>=4)
                break;
        }
        if(k>0)
            $('#'+id).html(htmlContent).show();
        else
            $('#'+id).hide().html('');

        var current_program,next_program, current_program_title="No Information",
            current_program_time='', next_program_title="No Information", next_program_time='',program_desc='No Information';
        if(current_program_exist){
            current_program=programmes[0];
            if(programmes.length>1)
                next_program=programmes[1];
        }
        else{
            if(programmes.length>0)
                next_program=programmes[0];
        }
        if(current_program){
            current_program_title=getAtob(current_program.title);
            current_program_time=current_program.start.substring(11)+' ~ '+current_program.stop.substring(11);
            program_desc=getAtob(current_program.description);
        }
        if(next_program){
            next_program_title=getAtob(next_program.title);
            next_program_time=next_program.start.substring(11)+' ~ '+next_program.stop.substring(11);
        }

        var elements=[$('#full-screen-information-progress').find('span')[0],$('#channel-page-right-part').find('.progress-amount')[0]]
        clearInterval(this.progressbar_timer);
        if(current_program_exist){
            var time_length=(new Date(current_program.stop)).getTime()-(new Date(current_program.start)).getTime();
            var current_time=(new Date()).getTime();
            var percentage=(current_time-(new Date(current_program.start).getTime()))*100/time_length;
            elements.map(function(item,index){
                $(item).css({width:percentage+'%'});
            })
        }
        else{
            $('#full-screen-current-program').text("No Information");
            elements.map(function(item,index){
                $(item).css({width:0});
            })
        }
        $('#full-screen-current-program').text(current_program_title);
        $('#full-screen-program-name').text(current_program_title);
        $('#full-screen-next-program').text(next_program_title);
        $('#full-screen-program-description').text(program_desc);
    },
    updateNextProgrammes:function(){
        this.showNextProgrammes();
        clearInterval(this.next_programme_timer);
        var that=this;
        this.next_programme_timer=setInterval(function () {
            that.showNextProgrammes();
        },60000)
    },
    getEpgProgrammes:function(){
        var that=this;
        var programmes=[];
        this.programmes=[];
        that.showNextProgrammes();
        var movie=this.movies[this.keys.channel_selection];
        if(settings.playlist_type==='xtreme'){
            var format_text='Y-MM-DD HH:mm';
            var epg_offset_minute=settings.epg_time_difference*60;
            $.ajax({
                method:'get',
                url:api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_short_epg&stream_id='+movie.stream_id+'&limit='+this.short_epg_limit_count,
                success:function (data) {
                    data.epg_listings.map(function (item) {
                        programmes.push({
                            start:getLocalChannelTime(item.start,epg_offset_minute).format(format_text),
                            stop:getLocalChannelTime(item.end,epg_offset_minute).format(format_text),
                            title:item.title,
                            description:item.description
                        })
                    })
                    that.programmes=programmes;
                    that.updateNextProgrammes();
                }
            });
        }
    },
    zoomInOut:function(){
        if(!this.full_screen_video){
            $('#live_channels_home .player-container').css({
                position:'relative',
                height:'58.3vh',
                width:'58.3vw'
            });
            
            // Reset video element for preview mode
            $('#channel-page-video').removeClass('video-fullscreen');
            $('#channel-page-video-lg').removeClass('video-fullscreen');
            
            this.keys.focused_part="channel_selection";
            media_player.full_screen_state=0;
            console.log('========================================');
            console.log('zoomInOut() ZOOM OUT - set full_screen_state to 0');
            console.log('full_screen_video:', this.full_screen_video);
            console.log('focused_part:', this.keys.focused_part);
            console.log('========================================');
            this.lockUI(400);
            this.scheduleSetDisplayArea(function() {
                media_player.setDisplayArea();
            }, 250);
            $('#full-screen-information').removeClass('visible');
            $('#live_channels_home').find('.channel-information-container').show();
            $('#live-channel-button-container').show();
            $('#live_channels_home').find('.video-skin').show();
        }
        else{
            console.log('========================================');
            console.log('zoomInOut() ZOOM IN START');
            console.log('  transitioning_to_fullscreen:', this.transitioning_to_fullscreen);
            console.log('  full_screen_video (before):', this.full_screen_video);
            console.log('  focused_part (before):', this.keys.focused_part);
            console.log('========================================');
            
            this.keys.focused_part="full_screen";
            this.full_screen_video=true;
            media_player.full_screen_state=1;
            
            console.log('zoomInOut() ZOOM IN: Updated flags IMMEDIATELY');
            console.log('  focused_part (after):', this.keys.focused_part);
            console.log('  full_screen_video (after):', this.full_screen_video);
            console.log('  full_screen_state:', media_player.full_screen_state);
            
            $('#live_channels_home .player-container').css({
                position:'fixed',
                left:0,
                top:0,
                height:'100vh',
                width:'100vw'
            });
            
            // CRITICAL: Add fullscreen class to escape container constraints
            $('#channel-page-video').addClass('video-fullscreen');
            $('#channel-page-video-lg').addClass('video-fullscreen');
            
            var that = this;
            
            // CRITICAL: Call setDisplayArea SYNCHRONOUSLY - no delay!
            // Samsung AVPlay must receive setDisplayRect while video is playing
            console.log('🔥 ZOOM IN: Calling setDisplayArea SYNCHRONOUSLY with full_screen_state:', media_player.full_screen_state);
            media_player.setDisplayArea();
            
            setTimeout(function() {
                that.transitioning_to_fullscreen = false;
                console.log('🔥 ZOOM IN: Cleared transitioning flag');
            }, 100);
            
            $('#live_channels_home').find('.channel-information-container').hide();
            $('#live-channel-button-container').hide();
            $('#live_channels_home').find('.video-skin').hide();
            
            clearTimeout(this.full_screen_timer);
            $('#full-screen-information').addClass('visible');
            
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║ Showing fullscreen info bar');
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log('  #full-screen-information will show with .visible class');
            console.log('  Channel name is in #full-screen-channel-name-compact');
            console.log('╚════════════════════════════════════════════════════════╝');
            
            var that = this;
            this.full_screen_timer=setTimeout(function(){
                console.log('Hiding fullscreen info bar after 5 seconds');
                $('#full-screen-information').removeClass('visible');
            },5000)
        }
    },
    showLiveChannelMovie:function(movie_id){
        var current_movie=getCurrentMovieFromId(movie_id, this.movies,'stream_id');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║ showLiveChannelMovie: START');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('  Channel ID:', movie_id);
        console.log('  Channel Name:', current_movie ? current_movie.name : 'NOT FOUND');
        console.log('  Channel Num:', current_movie ? current_movie.num : 'N/A');
        console.log('  full_screen_video:', this.full_screen_video);
        console.log('  media_player.full_screen_state:', media_player.full_screen_state);
        console.log('╚════════════════════════════════════════════════════════════╝');
        
        // Check if channel is blocked
        if(current_movie && isContentBlocked(current_movie.name, 'channel')) {
            showToast("Access Denied", "This channel is restricted");
            console.log('🚫 Channel blocked:', current_movie.name);
            return;
        }
        
        var url
        if(settings.playlist_type==="xtreme")
            url=getMovieUrl(movie_id,'live','ts');
        else if(settings.playlist_type==="type1")
            url=LiveModel.getMovieFromId(movie_id)['url'];
        try{
            if(media_player.state && media_player.state !== media_player.STATES.STOPPED){
                media_player.close();
            }
        }catch (e) {
            console.log('close() error (ignored):', e);
        }
        try{
            console.log('showLiveChannelMovie: Before init() - full_screen_state=', media_player.full_screen_state);
            console.log('showLiveChannelMovie: transitioning_to_fullscreen=', this.transitioning_to_fullscreen);
            media_player.init("channel-page-video","channel-page");
            console.log('showLiveChannelMovie: After init() - full_screen_state=', media_player.full_screen_state);
            
            if(this.transitioning_to_fullscreen){
                console.log('showLiveChannelMovie: ⚠️ TRANSITIONING TO FULLSCREEN - skipping setDisplayArea, zoomInOut will handle it');
            } else if(media_player.full_screen_state !== 1){
                console.log('showLiveChannelMovie: full_screen_state !== 1, scheduling setDisplayArea() for preview mode');
                var that = this;
                this.scheduleSetDisplayArea(function() {
                    media_player.setDisplayArea();
                }, 250);
            } else {
                console.log('showLiveChannelMovie: full_screen_state === 1, SKIPPING preview setDisplayArea()');
            }
        }catch (e) {
            console.log(e);
        }
        try{
            media_player.playAsync(url);
        }catch (e) {
            console.log(e);
        }
        
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║ Setting Channel Info Bar');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log('  Channel Name:', current_movie.name);
        console.log('  Channel Num:', current_movie.num);
        
        // Set channel name in the COMPACT header (new design)
        $('#full-screen-channel-name-compact').html(current_movie.name);
        $('#full-screen-channel-number').html(current_movie.num);
        $('#full-screen-channel-logo').attr('src',current_movie.stream_icon);
        
        console.log('  Set in #full-screen-channel-name-compact');
        console.log('  Set channel number in #full-screen-channel-number');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        this.current_channel_id=movie_id;
        if(!LiveModel.checkForAdult(current_category)){
            LiveModel.addRecentOrFavouriteMovie(current_movie,'recent');   // add to recent live channels
        }
    },
    showNextChannel:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="full_screen"){
            var menus=this.menu_items;
            var current_channel_index=0;
            for(var i=0;i<menus.length;i++){
                if($(menus[i]).data('channel_id')==this.current_channel_id){
                    current_channel_index=i;
                    break;
                }
            }
            current_channel_index+=increment; // the opposite position
            if(current_channel_index>=0 && current_channel_index<menus.length){
                var stream_id=$(menus[current_channel_index]).data('channel_id');
                $('#full-screen-information').removeClass('visible');
                this.current_channel_id=stream_id;
                clearTimeout(this.next_channel_timer);
                clearTimeout(this.full_screen_timer);
                var that=this;
                this.hoverMenuItem(current_channel_index);
                keys.focused_part="full_screen";
                this.hover_channel_id=stream_id;
                that.showLiveChannelMovie(stream_id);
                clearTimeout(that.full_screen_timer);
                $('#full-screen-information').addClass('visible');
                that.full_screen_timer=setTimeout(function(){
                    $('#full-screen-information').removeClass('visible');
                },5000)
                that.changeActiveChannel();
            }
        }else
            this.handleMenusUpDown(10*increment);
    },
    changeActiveChannel: function () {
        var keys=this.keys;
        $(this.active_channel_dom).removeClass('current');
        $(this.menu_items[keys.channel_selection]).addClass('current');
        this.active_channel_dom=this.menu_items[keys.channel_selection];
    },
    removeRecentChannel: function () {
        var keys=this.keys;
        if(current_category.category_id!=='recent' || keys.focused_part!="channel_selection")
            return;
        $(this.menu_items[keys.channel_selection]).remove();
        var movie=this.movies[keys.channel_selection];
        LiveModel.removeRecentOrFavouriteMovie(movie.stream_id,'recent');
        if(current_category.movies.length>0){
            this.movies=getSortedMovies(current_category.movies,settings.live_sort);
            this.menu_items=$('#channel-menu-wrapper .channel-menu-item');
            if(keys.channel_selection>=this.menu_items.length)
                keys.channel_selection=this.menu_items.length-1;
            this.hoverMenuItem(keys.channel_selection);
        }
        else {
            this.goBack();
        }
    },
    toggleRearrangeMode:function(condition){
        var keys=this.keys;
        
        if(this.rearrange_mode){
            this.rearrange_mode=false;
            $(this.prev_dom).removeClass('rearrange');
            return;
        }
        if(!condition)
            return;
        
        if(keys.focused_part!=="channel_selection"){
            this.hoverMenuItem(keys.channel_selection);
        }
        
        this.rearrange_mode=true;
        $(this.prev_dom).addClass('rearrange');
        var real_prev_selection=keys.channel_selection;
        this.rearrange_origin_position=real_prev_selection;
    },
    changeChannelDomContent:function(targetElement, channel, index){
        $(targetElement).find('.channel-number').text(channel.num);
        $(targetElement).find('.channel-icon').attr('src', channel.stream_icon);
        $(targetElement).data('index',index);
        $(targetElement).find('.channel-name').html(channel.name);
        $(targetElement).data('channel_id',channel.stream_id);
    },
    reArrangeFavouriteChannelPositions:function () {  // this will need when user remove favourite ids and ...
        var channel_orders=LiveModel.channel_orders;
        var orders=[];
        if(channel_orders['favourite'])
            orders=channel_orders['favourite'];
        if(this.removed_favourite_ids.length>0) {
            for(var i=orders.length-1;i>=0;i--) {
                if(!this.removed_favourite_ids.includes(orders[i].id))
                    continue;
                for(j=0;j<this.removed_favourite_ids.length;j++) {
                    if(orders[i].id===this.removed_favourite_ids[j]){
                        orders.splice(i,1);
                        break;
                    }
                }
            }
        }
        console.log(this.removed_favourite_ids);
        var movies=LiveModel.getRecentOrFavouriteMovies('favourite')
        for(var i=orders.length-1;i>=0;i--) {
            var exists=false;
            for(var j=0;j<movies.length;j++) {
                var movie=movies[j];
                if(orders[i].id===movie.stream_id && orders[i].name==movie.name){
                    orders[i].position=j;
                    exists=true;
                    break;
                }
            }
            if(!exists)
                orders.splice(i,1);
        }
        channel_orders['favourite']=orders;
        LiveModel.channel_orders=channel_orders;
        localStorage.setItem(storage_id+settings.playlist_url+'_channel_orders',JSON.stringify(channel_orders));
    },
    hoverMenuItem:function (index1) {
        // Guard: Don't process if no menu items (all blocked)
        if(!this.menu_items || this.menu_items.length === 0) {
            return;
        }
        
        var index;
        if(typeof index1=='number')
            index=index1;
        else
            index=$(index1).data('index');
        var keys=this.keys;
        keys.focused_part="channel_selection";
        keys.channel_selection=index;
        $(this.prev_dom).removeClass('active');
        $(this.menu_items[index]).addClass('active');
        if(this.rearrange_mode){
            $(this.prev_dom).removeClass('rearrange');
            $(this.menu_items[keys.channel_selection]).addClass('rearrange');
        }
        this.prev_dom=this.menu_items[index];
        this.hover_channel_id=$(this.menu_items[index]).data('channel_id');
        clearTimeout(this.hover_channel_timer);
        clearTimeout(this.channel_epg_timer);
        this.channel_epg_timer=null
        this.hover_channel_timer=null;
        this.changeFavouriteButton($(this.menu_items[this.keys.channel_selection]));
        moveScrollPosition($('#channel-menu-wrapper'),this.menu_items[index],'vertical',false);
        var that=this;
        this.hover_channel_timer=setTimeout(function () {
            that.getEpgProgrammes();
        },400)
    },
    hoverSearchBackItems:function (index) {
        this.keys.focused_part="search_back_selection";
        $(this.prev_dom).removeClass('active');
        $(this.search_back_buttons[index]).addClass('active');
        this.prev_dom=this.search_back_buttons[index];
    },
    hoverSearchMovies:function (index) {
        var keys=this.keys;
        keys.focused_part="search_selection";
        keys.search_selection=index;
        $(this.search_movie_items).removeClass('active');
        $(this.search_movie_items[index]).addClass('active');
    },
    hoverOperationModal:function (index) {
        var keys=this.keys;
        keys.operation_modal=index;
        $(this.channel_operation_items).removeClass('active');
        $(this.channel_operation_items[index]).addClass('active');
    },
    hoverChannelActionBtns:function (index) {
        var keys=this.keys;
        keys.focused_part="right_screen_part";
        keys.right_screen_part=index;
        $(this.prev_dom).removeClass('active');
        $(this.channel_action_items[index]).addClass('active');
        this.prev_dom=this.channel_action_items[index];
    },
    searchMovie:function(){
        $('#channel-operation-modal').modal('hide');  // becoz, we can go here from pop up menu, need to remove modal first
        $('.search-modal-container').show();
        $('#search-value').val("");
        $('.search-content-container').html('');
        this.keys.focused_part='search_selection';
        this.keys.search_selection=-1;
        $('#search-value').focus();
        var that=this;
        $('#search-value').keyup(function(){
            that.searchValueChange()
        });
        $('#search-value').change(function(){
            that.searchValueChange()
        });
        this.searchValueChange();
    },
    searchValueChange:function(){
        var search_value=$('#search-value').val();
        var current_movies=JSON.parse(JSON.stringify(this.movies));
        current_movies.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        })
        var filtered_movies=[];
        if(search_value=="")
            filtered_movies=current_movies;
        else {
            filtered_movies = current_movies.filter(function(movie){
                return movie.name.toLowerCase().includes(search_value.toLowerCase());
            })
        }
        
        // Filter out blocked channels if hide_blocked_content is enabled
        var hideBlocked = localStorage.getItem('hide_blocked_content') === 'true';
        if(hideBlocked) {
            filtered_movies = filtered_movies.filter(function(movie) {
                return !isContentBlocked(movie.name, 'channel');
            });
        }
        var htmlContent='';
        var movie_id_key='stream_id';
        filtered_movies.map(function (movie, index){
            htmlContent+=
                '<div class="search-item-wrapper"\
                    data-stream_id="'+movie[movie_id_key]+'"\
                    onclick="channel_page.searchItemClick(\''+movie[movie_id_key]+'\')"\
                    onmouseenter="channel_page.hoverSearchMovies('+index+')"\
                >'+
                movie.name+
                '</div>'
        })
        $('.search-content-container').html(htmlContent);
        this.search_movie_items=$('.search-content-container').find('.search-item-wrapper');
    },
    removeSearchResult:function(){
        $('.search-modal-container').hide();
        $('.search-content-container').html('');
        this.keys.focused_part="search_back_selection";
        this.search_selection=-1;
    },
    searchItemClick:function(stream_id){
        var keys=this.keys;
        this.removeSearchResult();
        var menus=$('#channel-menu-wrapper').find('.channel-menu-item');
        for(var i=0;i<menus.length;i++){
            var channel_stream_id=$(menus[i]).data('channel_id');
            if(stream_id==channel_stream_id){
                this.showLiveChannelMovie(stream_id);
                this.current_channel_id=stream_id;
                this.hover_channel_id=stream_id;
                keys.search_back_selection=0;
                this.hoverMenuItem(i);
                this.changeActiveChannel();
                break;
            }
        }
    },
    handleMenuClick:function(){
        console.log('═══════════════════════════════════════════════════════');
        console.log('handleMenuClick START');
        console.log('  focused_part:', this.keys.focused_part);
        console.log('  transitioning_to_fullscreen:', this.transitioning_to_fullscreen);
        console.log('  full_screen_video:', this.full_screen_video);
        console.log('═══════════════════════════════════════════════════════');
        
        if(this.uiLocked()){
            console.log('handleMenuClick: 🔒 BLOCKED BY UI LOCK');
            return;
        }
        
        if(this.transitioning_to_fullscreen){
            console.log('handleMenuClick: *** BLOCKED BY DEBOUNCE FLAG ***');
            return;
        }
        
        var keys=this.keys;
        if(keys.focused_part==="search_back_selection"){
            console.log('handleMenuClick: Branch → search_back_selection');
            $(this.search_back_buttons[keys.search_back_selection]).trigger('click');
            return;
        }
        if(keys.focused_part==="channel_selection"){  // if channel item clicked
            console.log('handleMenuClick: Branch → channel_selection');
            console.log('  Triggering click on menu_items[' + keys.channel_selection + ']');
            $(this.menu_items[keys.channel_selection]).trigger('click');
            return;
        }
        if(keys.focused_part==="full_screen"){ // if full screen mode, if click ok button,                                                                // then show full screen information
            console.log('handleMenuClick: Branch → full_screen');
            if(this.transitioning_to_fullscreen){
                console.log('handleMenuClick: ⚠️ Ignoring OK press - transition in progress');
                return;
            }
            console.log('handleMenuClick: ⬅ Exiting fullscreen - calling zoomInOut()');
            this.keys.focused_part="channel_selection";
            this.full_screen_video=false;
            this.zoomInOut();
            return;
        }
        if(keys.focused_part==="search_selection"){
            console.log('handleMenuClick: Branch → search_selection');
            var current_search_element=$('.search-item-wrapper')[keys.search_selection];
            $(current_search_element).trigger('click');
            return;
        }
        if(keys.focused_part==="right_screen_part"){  // in
            console.log('handleMenuClick: Branch → right_screen_part');
            $(this.channel_action_items[keys.right_screen_part]).trigger('click');
            return;
        }
        if(keys.focused_part==="operation_modal"){
            console.log('handleMenuClick: Branch → operation_modal');
            var buttons=$('#channel-operation-modal').find('.modal-operation-menu-type-1');
            $(buttons[keys.operation_modal]).trigger('click');
            if(keys.operation_modal==0){   // if clicked fav icon, after removing modal, focus to channel
                $('#channel-operation-modal').modal('hide');
                this.hoverMenuItem(keys.channel_selection);
            }
            return;
        }
        console.log('handleMenuClick: ⚠️ NO BRANCH MATCHED - focused_part:', keys.focused_part);
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        var menus=this.menu_items;
        
        // Guard: Don't process if no menu items (all blocked)
        if(!menus || menus.length === 0) {
            return;
        }
        
        if(keys.focused_part==="channel_selection"){  // if menus wrapper is active now
            var prev_selection=keys.channel_selection;
            keys.channel_selection+=increment;
            if(keys.channel_selection>=menus.length)
            {
                keys.channel_selection=menus.length-1;
                return;
            }
            if(keys.channel_selection<0){
                keys.channel_selection=0;
                this.hoverSearchBackItems(0);
                return;
            }
            if(this.rearrange_mode){
                var prev_channel, next_channel, movies;
                if(keys.channel_selection===prev_selection)
                    return;
                movies=makeRearrangeArray(this.movies,prev_selection,keys.channel_selection);
                this.movies=movies;
                var category=current_category;
                category.movies=movies;
                prev_channel=this.movies[prev_selection];
                next_channel=this.movies[keys.channel_selection];
                this.changeChannelDomContent(this.menu_items[prev_selection],prev_channel, prev_selection);
                this.changeChannelDomContent(this.menu_items[keys.channel_selection],next_channel, keys.channel_selection);
                var is_playing=$(this.menu_items[prev_selection]).hasClass('current');
                if(is_playing){
                    $(this.menu_items[prev_selection]).removeClass('current');
                    $(this.menu_items[keys.channel_selection]).addClass('current');
                }

                this.menu_items=$('#channel-menu-wrapper .channel-menu-item');
                clearTimeout(this.rearrange_timer);
                var that=this;
                this.rearrange_timer=setTimeout(function () {
                    var channel_orders=LiveModel.channel_orders;
                    var orders=[];
                    if(channel_orders[category.category_id]){
                        orders=channel_orders[category.category_id];
                    }
                    for(var i=0;i<orders.length;i++){
                        if(orders[i].id==next_channel.stream_id && orders[i].name==next_channel.name){
                            orders.splice(i,1);
                            break;
                        }
                    }
                    for(var i=0;i<orders.length;i++) {
                        for(var j=0;j<that.movies.length;j++) {
                            var movie=that.movies[j];
                            if(orders[i].id===movie.stream_id && orders[i].name==movie.name){
                                orders[i].position=j;
                                break;
                            }
                        }
                    }
                    orders.push({
                        id:next_channel.stream_id,
                        name:next_channel.name,
                        position:keys.channel_selection
                    })
                    orders=orders.sort(function (a,b){
                        return (a.position>b.position ? 1
                            :a.position<b.position ? -1 : 0);
                    })
                    channel_orders[category.category_id]=orders;
                    LiveModel.channel_orders=channel_orders;
                    localStorage.setItem(storage_id+settings.playlist_url+'_channel_orders',JSON.stringify(channel_orders));
                },this.rearrange_timeout)
            }
            this.hoverMenuItem(keys.channel_selection);
        }
        else if(keys.focused_part==='full_screen'){
            this.showNextChannel(-1*increment);
        }
        else if(keys.focused_part=="search_back_selection"){ // if search back button container is active now
            keys[keys.focused_part]+=increment;
            if(keys[keys.focused_part]>=1){
                this.hoverMenuItem(0);
                return;
            }
            if(keys.search_back_selection<0)
            {
                keys.search_back_selection=0;
                return;
            }
        }
        else if(keys.focused_part==="search_selection"){
            keys.search_selection+=increment;
            if(keys.search_selection<0)
            {
                var origin_value=$('#search-value').val();
                $('#search-value').focus();
                setTimeout(function () {
                    $('#search-value')[0].setSelectionRange(origin_value.length, origin_value.length)
                },300)
            }
            if(keys.search_selection>=$('.search-item-wrapper').length)
                keys.search_selection=$('.search-item-wrapper').length-1;
            $('.search-item-wrapper').removeClass('active');
            var current_element=$('.search-item-wrapper')[keys.search_selection];
            moveScrollPosition($('.search-content-container')[0],current_element,'vertical',false);
            $($('.search-item-wrapper')[keys.search_selection]).addClass('active');
        }
        else if(keys.focused_part==="operation_modal"){
            var buttons=$('#channel-operation-modal').find('.modal-operation-menu-type-1');
            keys.operation_modal+=increment;
            if(keys.operation_modal<0)
                keys.operation_modal=buttons.length-1;
            if(keys.operation_modal>=buttons.length)
                keys.operation_modal=0;
            $(buttons).removeClass('active');
            $(buttons[keys.operation_modal]).addClass('active');
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "channel_selection":
                if(increment>0)
                    this.hoverChannelActionBtns(0);
                break;
            case "search_back_selection":
                keys.search_back_selection+=increment;
                if(keys.search_back_selection>1){
                    keys.search_back_selection=0;
                    this.hoverChannelActionBtns(0);
                    return;
                }
                if(keys.search_back_selection<0)
                    keys.search_back_selection=0;
                this.hoverSearchBackItems(keys.search_back_selection);
                break;
            case "right_screen_part":
                keys.right_screen_part+=increment;
                if(keys.right_screen_part<0){
                    keys.right_screen_part=0;
                    this.hoverMenuItem(keys.channel_selection);
                    return;
                }
                if(keys.right_screen_part>2)
                    keys.right_screen_part=2;
                this.hoverChannelActionBtns(keys.right_screen_part);
                break;
        }
    },
    HandleKey:function(e) {
        var keyName = '';
        switch(e.keyCode) {
            case tvKey.RIGHT: keyName = 'RIGHT'; break;
            case tvKey.LEFT: keyName = 'LEFT'; break;
            case tvKey.DOWN: keyName = 'DOWN'; break;
            case tvKey.UP: keyName = 'UP'; break;
            case tvKey.ENTER: keyName = 'OK/ENTER'; break;
            case tvKey.CH_UP: keyName = 'PAGE UP'; break;
            case tvKey.CH_DOWN: keyName = 'PAGE DOWN'; break;
            case tvKey.RETURN: keyName = 'BACK'; break;
            default: keyName = 'KEY_' + e.keyCode;
        }
        
        console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
        console.log('┃ KEY PRESS: ' + keyName);
        console.log('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
        console.log('  State Snapshot:');
        console.log('    focused_part: ' + this.keys.focused_part);
        console.log('    full_screen_video: ' + this.full_screen_video);
        console.log('    transitioning_to_fullscreen: ' + this.transitioning_to_fullscreen);
        console.log('    media_player.full_screen_state: ' + media_player.full_screen_state);
        console.log('    current_channel_id: ' + this.current_channel_id);
        console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
        
        if(this.is_drawing)
            return;
        switch (e.keyCode) {
            case tvKey.RIGHT:
                console.log('→ Calling handleMenuLeftRight(1)');
                this.handleMenuLeftRight(1)
                break;
            case tvKey.LEFT:
                console.log('← Calling handleMenuLeftRight(-1)');
                this.handleMenuLeftRight(-1)
                break;
            case tvKey.DOWN:
                console.log('↓ Calling handleMenusUpDown(1)');
                this.handleMenusUpDown(1);
                break;
            case tvKey.UP:
                console.log('↑ Calling handleMenusUpDown(-1)');
                this.handleMenusUpDown(-1);
                break;
            case tvKey.ENTER:
                console.log('⏎ Calling handleMenuClick()');
                this.handleMenuClick();
                break;
            case tvKey.CH_UP:
                this.showNextChannel(1);
                break;
            case tvKey.CH_DOWN:
                this.showNextChannel(-1);
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.MENU:
            case tvKey.RED:
                this.showOperationModal();
                break;
            case tvKey.YELLOW:
                this.addOrRemoveFav();
                break;
            case tvKey.BLUE:
                // this.Exit();
                // goHomePageWithMovieType("movies");
                this.toggleRearrangeMode(true);
                break;
            case tvKey.GREEN:
                // this.catchUpChannel();
                this.removeRecentChannel();
                break;
            case tvKey.N1:
                this.goChannelNum(1);
                break;
            case tvKey.N2:
                this.goChannelNum(2);
                break;
            case tvKey.N3:
                this.goChannelNum(3);
                break;
            case tvKey.N4:
                this.goChannelNum(4);
                break;
            case tvKey.N5:
                this.goChannelNum(5);
                break;
            case tvKey.N6:
                this.goChannelNum(6);
                break;
            case tvKey.N7:
                this.goChannelNum(7);
                break;
            case tvKey.N8:
                this.goChannelNum(8);
                break;
            case tvKey.N9:
                this.goChannelNum(9);
                break;
            case tvKey.N0:
                this.goChannelNum(0);
                break;
            default:
                console.log("No matching")
        }
    }
}

"use strict";
var vod_series_player={
    player:null,
    back_url:'home-page',
    show_control:false,
    timeOut:null,
    current_key_index:0,
    keys:{
        focused_part:"control_bar",  //operation_modal
        control_bar:0,
        operation_modal:0,
        subtitle_audio_selection_modal:0,
        audio_selection_modal:0,
        episode_selection:0,
        prev_focus:'',
        resume_bar:0,
        info_bar:0
    },
    current_episode_index:-1,
    hover_episode_index:-1,
    current_subtitle_index:-1,
    current_audio_track_index:-1,
    subtitle_audio_menus:[],
    forwardTimer:null,
    current_time:0,
    show_audio_track:false,
    video_control_doms:$('#vod-series-video-controls-container .video-control-icon i'),
    video_info_doms:$('#vod-series-video-controls-container .video-info-icon'),
    vod_info_timer:null,
    current_movie:{},
    resume_time:0,
    resume_timer:null,
    episode_doms:[],
    resume_bar_doms:$('#video-resume-modal .resume-action-btn'),
    seek_timer:null,
    seek_interval_timer:null,
    has_episodes:false,
    range_slider:$('#vod-series-progress-container .rangeslider'),
    subtitle_doms:[],
    last_key_time:0,
    subtitle_loading:false,
    subtitle_loaded:false,
    fw_timer:null,
    current_movie_type:'',
    init:function(movie,movie_type,back_url ){
        console.log(movie);
        this.last_key_time=0;
        this.video_duration=0;
        var that=this;
        this.resume_bar_doms=$('#video-resume-modal .resume-action-btn');
        var keys=this.keys;
        this.current_movie=movie;
        this.current_movie_type=movie_type;
        this.current_time=0;
        this.fw_timer=null;
        this.subtitle_loaded=false;
        $('#vod-series-player-page').show();
        this.show_control=true;
        this.showControlBar(true);
        $('#vod-series-progress-container .rangeslider').removeClass('active');
        $(this.video_control_doms).removeClass('active');
        $(this.video_info_doms).removeClass('active');
        $(this.video_control_doms[2]).addClass('active');

        var element=$(this.video_control_doms[2]);
        $(element).removeClass('fa-play')
        $(element).addClass('fa-pause');
        $(element).data('action_type','pause');

        keys.control_bar=2;
        keys.focused_part='control_bar';
        keys.prev_focus='control_bar';
        this.back_url=back_url;
        current_route="vod-series-player-video";

        var slider_element=$('#vod-series-player-page').find('.video-progress-bar-slider')[0];
        $('#vod-series-player-page').find('.video-current-time').text("00:00");
        $('#vod-series-player-page').find('.video-total-time').text("00:00");
        $(slider_element).attr({
            min:0,
            max:100
        })
        $(slider_element).rangeslider({
            polyfill: false,
            rangeClass: 'rangeslider',
            onSlideEnd:function (position, value) {
                that.sliderPositionChanged(value);
            }
        })
        $(slider_element).val(0).change();
        $(slider_element).attr('disabled',true);
        $(slider_element).rangeslider('update');
        var url;
        if(movie_type==="movies")
        {
            if(settings.playlist_type==="xtreme")
                url=getMovieUrl(movie.stream_id,'movie',movie.container_extension);
            else if(settings.playlist_type==="type1")
                url=movie.url;
            $('#vod-series-video-title').html(movie.name);
        }
        else if(movie_type==='storage') {
            url=movie.toURI();
            $('#vod-series-video-title').html(movie.name);
        }
        else{
            if(settings.playlist_type==="xtreme")
                url=getMovieUrl(movie.id,'series',movie.container_extension)
            else if(settings.playlist_type==="type1")
                url=movie.url;
            $('#vod-series-video-title').html(movie.title);
        }


        var current_model,movie_key;
        if(movie_type==='movies'){
            current_model=VodModel;
            movie_key='stream_id';
        }
        else if(movie_type==='series'){
            current_model=SeriesModel;
            movie_key='id';
        }
        if(movie_type==='movies' || movie_type==='series') {
            try{
                movie_key=movie[movie_key].toString();
                if(current_model.saved_video_times[movie_key])
                    this.resume_time=current_model.saved_video_times[movie_key];
                else
                    this.resume_time=0;
            }catch (e) {
                console.log(e);
            }
        }
        try{
            media_player.close();
        }catch (e) {
        }
        try{
            media_player.init("vod-series-player-video","vod-series-player-page");
            media_player.setDisplayArea();
        }catch (e) {
            console.log(e);
        }
        try{
            media_player.playAsync(url);
        }catch (e) {
            console.log(e);
        }
        this.timeOut=setTimeout(function(){
            that.hideControlBar();
        },10000);

        this.current_subtitle_index=-1;
        this.current_audio_track_index=-1;
    },
    makeEpisodeDoms:function(back_url){
        this.keys.episode_selection=0;
        if(back_url==='episode-page'){
            var episodes=current_season.episodes;
            this.episodes=episodes;
            this.has_episodes=true;
            var html='';
            episodes.map(function (item, index) {
                var image='images/series.png';
                if(typeof item.info!='undefined'){
                    image=item.info.movie_image;
                }
                html+=
                    '<div class="player-season-item" ' +
                    '   onclick="vod_series_player.showSelectedEpisode()"' +
                    '   onmouseenter="vod_series_player.hoverEpisodeItem('+index+')"'+
                    '>' +
                    '   <img class="player-episode-img" src="'+image+'" onerror="this.src=\'images/series.png\'">' +
                    '   <div class="player-episode-title">'+item.title+'</div>\n' +
                    '</div>'
            })
            $('#player-seasons-container').html(html);
            this.keys.episode_selection=0;
            this.episode_doms=$('.player-season-item');
            $('#player-seasons-container').removeClass('expanded');
            $('#player-seasons-container').show();
        }else{
            this.has_episodes=false;
            $('#player-seasons-container').html('');
            this.episode_doms=$('.player-season-item')
            this.episode_doms=[];
            $('#player-seasons-container').hide();
        }
    },
    showResumeBar:function(){
        var keys=this.keys;
        if(this.resume_time>0){
            var milliseconds=platform==='samsung' ? 1000 : 1;
            var resume_time_format=media_player.formatTime(this.resume_time/milliseconds);
            $('#vod-resume-time').text(resume_time_format);
            $('#video-resume-modal').show();
            this.hideControlBar();
            clearTimeout(this.resume_timer);
            if(keys.focused_part!="subtitle_audio_selection_modal") // if already showing subtitle modal, should not change focused part
                keys.focused_part='resume_bar';
            else
                keys.prev_focus="resume_bar";  //
            keys.resume_bar=0;

            $(this.resume_bar_doms).removeClass('active');
            $(this.resume_bar_doms[0]).addClass('active');
            this.resume_timer=setTimeout(function () {
                $('#video-resume-modal').hide();
                if(keys.focused_part=='resume_bar'){
                    // only when focus on resume bar, change into prev focus when hiding resume modal
                    if(keys.prev_focus!='resume_bar')
                        keys.focused_part=keys.prev_focus;
                    else
                        keys.focused_part='info_bar';
                }
                else if(keys.focused_part==="subtitle_audio_selection_modal")
                    keys.prev_focus="info_bar";
            },15000)
        }
    },
    Exit:function(){
        this.saveVideoTime();
        current_route=this.back_url;
        try{
            media_player.close();
        }catch(e){
            console.log(e);
        }
        $('#'+media_player.parent_id).find('.video-error').hide();
        $('#'+media_player.parent_id).find('.subtitle-container').text('');
        $('#vod-series-player-page').hide();
    },
    saveVideoTime:function(){
        try{
            var current_time,duration, dt;
            if(platform==='samsung'){
                current_time=webapis.avplay.getCurrentTime();
                duration=webapis.avplay.getDuration();
                dt=5000;
            }
            else if(platform==='lg'){
                current_time=media_player.videoObj.currentTime;
                duration=media_player.videoObj.duration;
                dt=5;
            }
            var movie=this.current_movie;
            // if(environment==='develop'){ // to test saving video time
            //     duration=10000;
            //     current_time=4000;
            // }
            if(environment==='develop'){ // to test removing video time
                duration=100;
                current_time=100;
            }
            if(duration-current_time>=dt){
                if(this.current_movie_type==='movies')
                {
                    console.log("here save current time", movie, current_time);
                    VodModel.saveVideoTime(movie,current_time);
                }
                if(this.current_movie_type==='series')
                    SeriesModel.saveVideoTime(movie.id,current_time);
            }else{
                if(this.current_movie_type==='movies'){
                    VodModel.removeVideoTime(movie.stream_id);
                    if(this.back_url==='home-page' && home_page.keys.focused_part==='grid_selection' && current_category.category_id==='resume'){ // remove current selected movie from rendered list
                        var keys=home_page.keys;
                        var domElement=$('#movie-grids-container .movie-item-container')[keys.grid_selection];
                        $(domElement).remove();
                        home_page.movies.splice(keys.grid_selection,1);
                        var grid_doms=$('#movie-grids-container .movie-item-wrapper');
                        grid_doms.map(function (index, item){
                            $(item).data('index', index);
                        })
                        home_page.movie_grid_doms=grid_doms;
                        if(grid_doms.length==0)
                            keys.grid_selection=-1;
                        else{
                            keys.grid_selection--;
                            if(keys.grid_selection<0)
                                keys.grid_selection=0;
                        }
                    }
                }

                if(this.current_movie_type==='series')
                    SeriesModel.removeVideoTime(movie.id);
            }
        }catch (e) {
            console.log("here saving video time error",e);
        }
    },
    goBack:function(){
        $('.modal').modal('hide');
        var keys=this.keys;
        if(this.show_control){
            this.hideControlBar();
        }else{
            if(keys.focused_part==="control_bar" || keys.focused_part==='info_bar' || keys.focused_part==='slider' || keys.focused_part==='episode_selection'){
                this.Exit();
                if(this.back_url==="home-page"){
                    home_page.reEnter();
                    if (home_page.keys.focused_part === 'grid_selection' && current_category.category_id === 'resume') {
                        if (home_page.keys.grid_selection < 0)
                            home_page.hoverToSubMenu(home_page.keys.submenu_selection);
                        else {
                            home_page.hoverMovieGridItem(home_page.movie_grid_doms[home_page.keys.grid_selection])
                        }
                    }
                }
                if(this.back_url==="episode-page"){
                    $('#episode-page').show();
                    var season_buttons=$('.episode-grid-item-wrapper');
                    moveScrollPosition($('#episode-grid-container'),season_buttons[episode_variable.keys.index],'vertical',false)
                }
                if(this.back_url==='search-page'){
                    $('#search-page').show();
                    search_page.hoverMovie(search_page.keys.hor_keys[1],1);
                }
                if(this.back_url==='storage-page') {
                    console.log('here');
                    $('#storage-page').show();
                    storage_page.hoverMenuItem(storage_page.keys.menu_selection);
                }
            }
        }
        if(this.keys.focused_part==="operation_modal"){
            $('#vod-series-player-operation-modal').modal('hide');
            keys.focused_part="control_bar";
        }
        if(keys.focused_part==="subtitle_audio_selection_modal"){
            $('#subtitle-loader-container').hide();
            keys.focused_part=keys.prev_focus;
            $('#subtitle-selection-modal').modal('hide');
        }
        if(keys.focused_part==='vod_info'){
            $('#vod-video-info-container').hide();
            clearTimeout(this.vod_info_timer);
            keys.focused_part=keys.prev_focus;
        }
        if(keys.focused_part==='resume_bar'){
            $('#video-resume-modal').hide();
            if(keys.prev_focus!='resume_bar')
                keys.focused_part=keys.prev_focus;
            else // this means, in subtitle modal, the prev focus is settled to resume bar, so in this case,
                // have to go back to info_bar
                keys.focused_part='info_bar'
            clearTimeout(this.resume_timer);
        }
    },
    playPauseVideo:function(action_type){
        this.showControlBar(false);
        var icons=this.video_control_doms;
        var element=$(icons[2]);
        if(action_type==="")
            action_type=$(element).data('action_type');
        if(action_type==="pause")
        {
            try{
                media_player.pause();
                $(element).removeClass('fa-pause')
                $(element).addClass('fa-play');
                $(element).data('action_type','play');
            }catch (e) {
            }
        }
        else if(action_type==='play'){
            try{
                media_player.play();
                $(element).removeClass('fa-play')
                $(element).addClass('fa-pause');
                $(element).data('action_type','pause');
            }catch(e){
            }
        }
    },
    seekTo:function(step){
        var duration, newTime;
        if(platform==='samsung'){
            var new_key_time=new Date().getTime()/1000;
            if(new_key_time-this.last_key_time<0.1){
                return;
            }
            this.last_key_time=new_key_time;
            if(this.current_time===0)
                this.current_time=media_player.current_time/1000;
            if(this.video_duration!=0)
                duration=this.video_duration;
            else{
                try{
                    duration=webapis.avplay.getDuration()/1000;
                    this.video_duration=duration;
                }catch (e) {
                }
            }
            if(duration==0)
                return;
            newTime = this.current_time + step;
            if(newTime<0){
                return;
            }
            if(newTime>=duration){
                return;
            }
            this.current_time=newTime;
            clearTimeout(this.seek_timer);
            if(media_player.state===media_player.STATES.PLAYING){
                try{
                    media_player.pause();
                }catch(e){
                }
            }

            $('#'+media_player.parent_id).find('.video-loader').show();
            this.seek_timer=setTimeout(function () {
                console.log(newTime);
                webapis.avplay.seekTo(newTime*1000);
                setTimeout(function () {
                    try{
                        media_player.play();
                    }catch(e){
                    }
                },200)
            },500);
        }else if(platform==='lg'){
            if(this.current_time===0)
                this.current_time=media_player.videoObj.currentTime;
            duration=media_player.videoObj.duration;
            newTime = this.current_time + step;
            if(duration==0)
                return;
            if(newTime<0)
                newTime=0;
            if(newTime>=duration)
                newTime=duration;
            this.current_time=newTime;
            media_player.videoObj.currentTime=newTime;
        }
        if (duration > 0) {
            if(SrtOperation.srt && SrtOperation.srt.length>0){  // here will hide subtitles first
                $('#'+media_player.parent_id).find('.subtitle-container').html('');
                SrtOperation.stopOperation();
                if(this.fw_timer){
                    clearTimeout(this.fw_timer);
                    this.fw_timer=null;
                }
                this.fw_timer=setTimeout(function (){
                    SrtOperation.stopped=false;
                    SrtOperation.findIndex(media_player.videoObj.currentTime,0,SrtOperation.srt.length-1);
                },200)
            }
            $('#'+media_player.parent_id).find('.video-progress-bar-slider').val(newTime).change();
            $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(newTime));
        }
    },
    sliderPositionChanged:function(newTime){
        var keys=this.keys;
        keys.focused_part='slider';
        keys.prev_focus='slider';
        $('#vod-series-progress-container .rangeslider').addClass('active');
        $(this.episode_doms).removeClass('active');
        $(this.video_control_doms).removeClass('active');
        $(this.video_info_doms).removeClass('active');
        media_player.videoObj.currentTime=newTime;
        this.current_time=newTime;
        $('#'+media_player.parent_id).find('.video-progress-bar-slider').val(newTime).change();
        $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(newTime));
    },
    showSelectedEpisode:function(){
        var episode_keys=episode_variable.keys;
        var keys=this.keys;
        var episode_items=$('.episode-grid-item-wrapper');
        $(episode_items).removeClass('active');
        episode_keys.index+=keys.episode_selection;
        $(episode_items[episode_keys.index]).addClass('active');
        var episodes=this.episodes;
        var episode=episodes[keys.episode_selection];
        if((current_episode.episode_num!=episode.episode_num) || (current_episode.id!=episode.id) || (current_episode.title!=episode.title) || (current_episode.url!=episode.url)){
            this.saveVideoTime();
            this.resume_time=0;
            try{
                media_player.close();
            }catch(e){
            }
            current_episode=episode;
            this.init(current_episode,'series',"episode-page")
        }
    },
    showNextVideo:function(increment){
        this.saveVideoTime();
        this.resume_time=0;
        switch (this.back_url) {
            case "home-page":
                var movie_grids=$('#movie-grids-container .movie-item-wrapper');
                $('#movie-grids-container .movie-item-wrapper').removeClass('active');
                $(movie_grids[0]).addClass('active');
                var keys=home_page.keys;
                if(keys.focused_part==='grid_selection'){
                    keys.grid_selection+=increment;
                    if(keys.grid_selection<0)
                        keys.grid_selection=0;
                    if(keys.grid_selection>=movie_grids.length)
                        keys.grid_selection=movie_grids.length-1;
                    $(movie_grids).removeClass('active');
                    $(movie_grids[keys.grid_selection]).addClass('active');
                    current_movie=home_page.movies[keys.grid_selection];
                    this.init(current_movie,"movies","home-page");
                }
                if(keys.focused_part==='slider_selection'){
                    var movie_containers=$('.movie-slider-wrapper');
                    var movie_items=$(movie_containers[keys.slider_selection]).find('.movie-item-wrapper');
                    $('.movie-item-wrapper').removeClass('active');
                    keys.slider_item_index+=increment;
                    if(keys.slider_item_index<0)  // this means, now cursor is the first position and so, it needs to move to left panel
                        keys.slider_item_index=movie_items.length-1;
                    if(keys.slider_item_index>=movie_items.length)
                        keys.slider_item_index=0;
                    $(movie_items[keys.slider_item_index]).addClass('active');

                    var current_movie_item=$(movie_items[keys.slider_item_index]);
                    var stream_id=$(current_movie_item).data('stream_id');
                    home_page.current_preview_id=stream_id;
                    home_page.current_preview_type='movies';
                    current_movie=getCurrentMovieFromId(stream_id,VodModel.getLatestMovies(),'stream_id');
                    this.init(current_movie,"movies","home-page");
                }
                break;
            case 'episode-page':
                var keys=episode_variable.keys;
                var episode_items=$('.episode-grid-item-wrapper');
                $(episode_items).removeClass('active');
                keys.index+=increment;
                if(keys.index<0)
                    keys.index=0;
                if(keys.index>=episode_items.length)
                    keys.index=episode_items.length;
                $(episode_items[keys.index]).addClass('active');
                var episodes=current_season.episodes;
                current_episode=episodes[keys.index];
                this.init(current_episode,'series',"episode-page")
                break;
            case 'search-page':
                var keys=search_page.keys;
                var key=keys.hor_keys[1];
                key+=increment;
                if(key<0)
                    return;
                if(key>=search_page.movie_doms[1].length)
                    return;
                current_movie=search_page.filtered_movies[1][key];
                search_page.keys.hor_keys[1]=key;
                this.init(current_movie,"movies","search-page");
                break;
            case 'storage-page':
                storage_page.video_index+=increment;
                if(storage_page.video_index>=storage_page.video_files.length) {
                    storage_page.video_index=storage_page.video_files.length-1;
                    return;
                }
                if(storage_page.video_index<0) {
                    storage_page.video_index=0;
                    return;
                }
                var video_file_wrapper=storage_page.video_files[storage_page.video_index];
                storage_page.keys.menu_selection=video_file_wrapper.index;
                this.init(video_file_wrapper.file,'storage','storage-page');
                break;
        }
    },
    showControlBar:function(move_focus){
        $('#vod-series-video-controls-container').slideDown();
        $('#vod-series-video-title').slideDown();
        this.show_control=true;
        var that=this;
        var keys=this.keys;
        if(move_focus){
            keys.focused_part='control_bar';
            keys.prev_focus='control_bar';
            keys.control_bar=2;
            $(this.video_control_doms).removeClass('active');
            $(this.video_info_doms).removeClass('active');
            $(this.video_control_doms[2]).addClass('active');
            $(this.episode_doms).removeClass('active');
            $('#player-seasons-container').removeClass('expanded');
        }
        clearTimeout(this.timeOut)
        this.timeOut=setTimeout(function(){
            that.hideControlBar();
        },5000);
    },
    hideControlBar:function(){
        $('#vod-series-video-controls-container').slideUp();
        $('#vod-series-video-title').slideUp();
        this.show_control=false;
    },
    makeMediaTrackElement:function(items,kind){
        var htmlContent="";
        if(platform==='samsung'){
            var language_key="track_lang";
            if(kind!=="TEXT")
                language_key="language";
            items.map(function(item){
                var extra_info=item.extra_info;
                htmlContent+=
                    '<div class="modal-operation-menu-type-2 subtitle-option">\
                        <input class="magic-radio" type="radio" name="radio" id="disable-subtitle"\
                            value="'+item.index+'">\
                    <label for="disable-subtitle">'+extra_info[language_key]+'</label>\
                </div>';
            })
        }
        else if(platform==='lg'){
            var default_track_text=kind==="TEXT" ? "Subtitle " : "Track ";
            items.map(function(item,index){
                var language=item.language;
                if(!language)
                    language=default_track_text+(index+1);
                htmlContent+=
                    '<div class="modal-operation-menu-type-2 subtitle-option"\
                        onmouseenter="vod_series_player.hoverSubtitleAudioModal('+index+')" \
                        onclick="vod_series_player.handleMenuClick()" \
                    >\
                        <input class="magic-radio" type="radio" name="radio"\
                            value="'+index+'">\
                        <label>'+language+'</label>\
                    </div>'
            })
        }
        return htmlContent;
    },
    showSubtitleAudioModal:function(kind){
        this.hideControlBar();
        var keys=this.keys;
        console.log(keys.focused_part,'in subtitle audio modal');
        if(keys.focused_part!="subtitle_audio_selection_modal")
            keys.prev_focus=keys.focused_part;
        try{
            $('#subtitle-loader-container').hide();
            var subtitles;
            if(platform!=='samsung' && kind==='TEXT'){  // we will use our own made subtitles
                if(!this.subtitle_loaded) {
                    $("#subtitle-selection-container").html('');
                    if(!(this.current_movie_type==='movies' || (this.current_movie_type==='series' && settings.playlist_type==='xtreme')))
                    {
                        this.showEmptySubtitleMessage(kind);
                        return;
                    }
                    var that=this;
                    this.subtitle_loading=true;
                    $('#subtitle-selection-modal').modal('show');
                    this.hoverSubtitleAudioModal(-2);
                    $('#subtitle-loader-container').show();
                    var subtitle_request_data;
                    if(this.current_movie_type==='movies'){
                        subtitle_request_data={
                            movie_name:this.current_movie.name
                        }
                        if(this.current_movie.tmdb_id)
                            subtitle_request_data.tmdb_id=this.current_movie.tmdb_id
                    }else {
                        var episode=current_season.episodes[episode_variable.keys.index];
                        subtitle_request_data={
                            movie_name:current_series.name,
                            movie_type:'episode',
                            season_number:current_season.season_number ? current_season.season_number : seasons_variable.keys.index+1,
                            episode_number:episode.episode_num ? episode.episode_num : episode_variable.keys.index+1
                        }
                        if(this.current_movie.info && this.current_movie.info.tmdb_id)
                            subtitle_request_data.tmdb_id=this.current_movie.info.tmdb_id;
                    }
                    $.ajax({
                        method:'post',
                        url:'https://flixiptv.xyz/api/get-subtitles',
                        data: subtitle_request_data,
                        dataType:'json',
                        success:function (result) {
                            that.subtitle_loading=false;
                            that.subtitle_loaded=true;
                            $('#subtitle-loader-container').hide();
                            if(result.status==='success'){
                                if(result.subtitles.length>0){
                                    media_player.subtitles= result.subtitles;
                                    that.renderSubtitles(kind, media_player.subtitles);
                                }
                                else{
                                    media_player.subtitles=[];
                                    that.showEmptySubtitleMessage(kind);
                                }
                            }
                        },
                        error:function (error){
                            that.subtitle_loading=false;
                            that.subtitle_loaded=true;
                            that.showEmptySubtitleMessage(kind);
                        }
                    })
                }
                else {
                    if(media_player.subtitles.length>0) {
                        this.renderSubtitles(kind, media_player.subtitles);
                    }else
                        this.showEmptySubtitleMessage(kind);
                }
            }
            else {
                subtitles=media_player.getSubtitleOrAudioTrack(kind);
                if(subtitles.length>0)
                    this.renderSubtitles(kind, subtitles)
                else{
                    if(kind==="TEXT")
                        showToast("Sorry","No Subtitles exists");
                    else
                        showToast("Sorry","No Audios exists");
                }
            }
        }catch (e) {
            showToast("Sorry","Video not loaded yet");
        }
    },
    renderSubtitles: function (kind, subtitles){
        var keys=this.keys;
        if(keys.focused_part==='resume_bar') { // if already showing resume bar, subtitles should not be displayed
            $('#subtitle-selection-modal').modal('hide');
            return;
        }
        if(kind=="TEXT")
            $("#subtitle-modal-title").text("Subtitle");
        else
            $("#subtitle-modal-title").text("Audio Track");
        keys.focused_part="subtitle_audio_selection_modal";
        $('#subtitle-selection-modal .modal-operation-menu-type-2').removeClass('active');
        var htmlContent=this.makeMediaTrackElement(subtitles, kind);
        $("#subtitle-selection-container").html(htmlContent);
        $('#subtitle-selection-modal').modal('show');
        var subtitle_menus=$('#subtitle-selection-modal .subtitle-option');
        this.subtitle_audio_menus=subtitle_menus;
        $(subtitle_menus[0]).addClass('active');
        $(subtitle_menus[0]).find('input').prop('checked',true);
        keys.subtitle_audio_selection_modal=0;
        var current_selected_index=kind==="TEXT" ? this.current_subtitle_index : this.current_audio_track_index;
        var that=this;
        var diff_index=0;
        subtitles.map(function(item,index){
            if(index==current_selected_index){
                that.keys.subtitle_audio_selection_modal=index+diff_index;
                $(subtitle_menus).removeClass('active');
                $(subtitle_menus).find('input').prop('checked',false);
                $(subtitle_menus[index+diff_index]).addClass('active');
                $(subtitle_menus[index+diff_index]).find('input').prop('checked',true);
            }
        });
        var subtitle_audio_modal_buttons=$('#subtitle-selection-modal .modal-btn-1');
        $(subtitle_audio_modal_buttons).removeClass('active');
    },
    showEmptySubtitleMessage: function (kind) {
        $('#subtitle-selection-modal').modal('hide');
        if(kind==="TEXT")
            showToast("Sorry","No Subtitles exists");
        else
            showToast("Sorry","No Audios exists");
        var keys=this.keys;
        if(keys.focused_part!="resume_bar")
            keys.focused_part=keys.prev_focus;
    },
    changeScreenRatio:function(){
        try{
            media_player.toggleScreenRatio();
        }catch (e) {
        }
    },
    showStreamSummaryFromVideo:function(){
        var stream_summary;
        try{
            stream_summary = media_player.videoObj.videoWidth + '*' + media_player.videoObj.videoHeight;
        }catch (e) {
            console.log(e);
        }
        $('#vod-video-info-subwrapper2').text(stream_summary);
    },
    showVideoInfo:function(){
        var movie=this.current_movie;
        this.hideControlBar();
        var vod_desc='', stream_summary='No Info', stream_icon, stream_title;
        if(this.current_movie_type==='movies'){
            stream_title=movie.name;
            stream_icon = movie.stream_icon;
        }else{  // if series
            stream_title=movie.title;
            stream_icon='images/series.png';
        }
        var that=this;
        if(settings.playlist_type==="xtreme") {
            if(this.current_movie_type==='movies'){
                $.getJSON(api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_vod_info&vod_id='+current_movie.stream_id, function (response) {
                    var info = response.info;
                    if (typeof info.description != 'undefined')
                        vod_desc = info.description;
                    if (typeof info.video != 'undefined') {
                        if (typeof info.video.width != 'undefined' && typeof info.video.height) {
                            stream_summary = info.video.width + '*' + info.video.height;
                        }
                        if (typeof info.video.codec_long_name != 'undefined')
                            stream_summary = stream_summary + ', ' + info.video.codec_long_name;
                        $('#vod-video-info-subwrapper2').text(stream_summary);
                        if (stream_summary==='No Info'){
                            that.showStreamSummaryFromVideo();
                        }
                    }else{
                        that.showStreamSummaryFromVideo();
                    }
                    $('#vod-video-info-desc').text(vod_desc);
                }).fail(function () {
                    that.showStreamSummaryFromVideo();
                })
            }else{
                if(typeof movie.info!="undefined"){
                    var info=movie.info;
                    if(typeof info.plot!='undefined')
                        vod_desc=info.plot;
                    stream_icon=info.movie_image
                    if(typeof info.video!="undefined"){
                        stream_summary = info.video.width + '*' + info.video.height;
                        if (typeof info.video.codec_long_name != 'undefined')
                            stream_summary = stream_summary + ', ' + info.video.codec_long_name;
                    }else{
                        that.showStreamSummaryFromVideo();
                    }
                }else{
                    that.showStreamSummaryFromVideo();
                }
                $('#vod-video-info-desc').text(vod_desc);
            }
        }else{
            if(platform==='samsung'){
                try{
                    var stream_info=webapis.avplay.getCurrentStreamInfo();
                    if(typeof stream_info[0]!='undefined'){
                        var extra_info=JSON.parse(stream_info[0].extra_info);
                        stream_summary=extra_info.Width+'*'+extra_info.Height;
                    }
                    $('#vod-video-info-desc').text(vod_desc);
                    $('#vod-video-info-subwrapper2').text(stream_summary);
                }catch (e) {
                }
            }else if(platform==='lg'){
                $('#vod-video-info-desc').text('');
                $('#vod-video-info-subwrapper2').text('');
                that.showStreamSummaryFromVideo();
            }
        }
        $('#vod-video-info-title').text(stream_title);
        $('#vod-video-info-img-container img').attr('src',stream_icon);
        $('#vod-video-info-container').show();
        clearTimeout(this.vod_info_timer);
        var keys=this.keys;
        keys.focused_part='vod_info';
        this.vod_info_timer=setTimeout(function () {
            $('#vod-video-info-container').hide();
            keys.focused_part=keys.prev_focus;
        },10000)
    },
    cancelSubtitle:function(){
        $('#subtitle-selection-modal').modal('hide');
        this.keys.focused_part="control_bar";
    },
    confirmSubtitle:function(){
        $('#subtitle-selection-modal').modal('hide');
        this.keys.focused_part="control_bar";
        var modal_title=$("#subtitle-modal-title").text();
        if(modal_title.toLowerCase().includes('subtitle')){
            this.current_subtitle_index=$('#subtitle-selection-modal').find('input[type=radio]:checked').val();
            try{
                media_player.setSubtitleOrAudioTrack("TEXT",parseInt(this.current_subtitle_index));
                $("vod-series-player-page").find('.subtitle-container').css({visibility:'visible'});
            }catch(e){

            }
            console.log(this.current_subtitle_index);
        }
        else{
            this.current_audio_track_index=$('#subtitle-selection-modal').find('input[type=radio]:checked').val();
            try{
                media_player.setSubtitleOrAudioTrack("AUDIO",parseInt(this.current_audio_track_index))
            }catch(e){

            }
            console.log(this.current_audio_track_index);
        }
    },
    removeAllActiveClass:function(hide_episode){
        $(this.video_info_doms).removeClass('active');
        $(this.episode_doms).removeClass('active');
        $(this.video_control_doms).removeClass('active');
        $(this.range_slider).addClass('active');
        if(hide_episode){
            $('#player-seasons-container').removeClass('expanded');
        }
    },
    hoverVideoControl:function(index){
        var keys=this.keys;
        this.removeAllActiveClass(true);
        keys.control_bar=index;
        keys.focused_part="control_bar";
        $(this.video_control_doms[index]).addClass('active');
    },
    hoverVideoInfoBtn:function(index){
        var keys=this.keys;
        keys.info_bar=index;
        keys.focused_part='info_bar';
        this.removeAllActiveClass(true);
        $(this.video_info_doms[index]).addClass('active');
    },
    hoverEpisodeItem:function(index){
        this.showControlBar(false);
        var keys=this.keys;
        keys.focused_part="episode_selection";
        keys.episode_selection=index;
        $(this.video_info_doms).removeClass('active');
        $(this.video_control_doms).removeClass('active');
        $('#vod-series-progress-container .rangeslider').removeClass('active');
        $(this.episode_doms).removeClass('active');
        $(this.episode_doms[keys.episode_selection]).addClass('active');
        moveScrollPosition($('#player-seasons-container'),this.episode_doms[keys.episode_selection],'horizontal',false)
    },
    hoverSubtitleAudioModal:function(index){
        var keys=this.keys;
        if(index>=0){
            keys.subtitle_audio_selection_modal=index;
            moveScrollPosition($('#subtitle-selection-container'),this.subtitle_audio_menus[index],'vertical',false);
        }
        else
            keys.subtitle_audio_selection_modal=this.subtitle_audio_menus.length+index;
        $(this.subtitle_audio_menus).removeClass('active');
        $(this.subtitle_audio_menus[index]).addClass('active');
    },
    hoverResumeBar:function(index){
        var keys=this.keys;
        keys.resume_bar=index;
        $(this.resume_bar_doms).removeClass('active');
        $(this.resume_bar_doms[index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        if(keys.focused_part==="control_bar"){
            if(this.show_control)
                $(this.video_control_doms[keys.control_bar]).trigger('click');
            this.showControlBar(false);
            return;
        }
        else if(keys.focused_part==='info_bar'){
            if(this.show_control)
                $(this.video_info_doms[keys.info_bar]).trigger('click');
            this.showControlBar(false);
        }
        else if(keys.focused_part==='episode_selection'){
            if(this.show_control){
                this.showControlBar(false);
                $(this.episode_doms[keys.episode_selection]).trigger('click');
            }else{
                this.showControlBar(true);
            }
        }
        else if(keys.focused_part==='slider' && !this.show_control){
            this.showControlBar(true);
        }
        else if(keys.focused_part==="operation_modal"){
            var buttons=$('#vod-series-player-operation-modal').find('.modal-operation-menu-type-1');
            $(buttons[keys.operation_modal]).trigger('click');
        }
        else if(keys.focused_part==="subtitle_audio_selection_modal"){
            if(this.subtitle_loading)
                return;
            if(keys.subtitle_audio_selection_modal>=this.subtitle_audio_menus.length-2){  // this means ok, or cancel button cliced in subtitle selection modal
                $(this.subtitle_audio_menus[keys.subtitle_audio_selection_modal]).trigger('click');
            }
            else{
                $(this.subtitle_audio_menus).find('input').prop('checked',false);
                $(this.subtitle_audio_menus[keys.subtitle_audio_selection_modal]).find('input').prop('checked',true);
            }
        }
        else if(keys.focused_part==='resume_bar'){
            this.goBack();
            if(keys.resume_bar==0){
                try{
                    if(platform==='samsung'){
                        var current_time=webapis.avplay.getCurrentTime();
                        if(current_time<this.resume_time){
                            webapis.avplay.seekTo(this.resume_time)
                        }
                    }else if(platform==='lg'){
                        var current_time=media_player.videoObj.currentTime;
                        if(current_time<this.resume_time){
                            media_player.videoObj.currentTime=this.resume_time;
                            $('#'+media_player.parent_id).find('.video-progress-bar-slider').val(this.resume_time).change();
                            $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(this.resume_time));
                        }
                    }
                }catch (e) {
                }
            }
        }
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        if(this.show_control){
            this.showControlBar(false);
            if(keys.focused_part==="control_bar"){
                keys.control_bar+=increment;
                if(keys.control_bar<0)
                    keys.control_bar=0;
                if(keys.control_bar>=this.video_control_doms.length)
                    keys.control_bar=this.video_control_doms.length-1;
                $(this.video_control_doms).removeClass('active');
                $(this.video_control_doms[keys.control_bar]).addClass('active');
            }
            if(keys.focused_part==='info_bar'){
                keys.info_bar+=increment;
                if(keys.info_bar<0)
                    keys.info_bar=0;
                if(keys.info_bar>=this.video_info_doms.length)
                    keys.info_bar=this.video_info_doms.length-1;
                $(this.video_info_doms).removeClass('active');
                $(this.video_info_doms[keys.info_bar]).addClass('active');
            }
            if(keys.focused_part==='slider'){
                this.seekTo(30*increment);
            }
            if(keys.focused_part==='episode_selection'){
                $(this.episode_doms).removeClass('active');
                keys.episode_selection+=increment;
                if(keys.episode_selection<0)
                    keys.episode_selection=this.episode_doms.length-1;
                if(keys.episode_selection>=this.episode_doms.length)
                    keys.episode_selection=0;
                $(this.episode_doms[keys.episode_selection]).addClass('active');
                moveScrollPosition($('#player-seasons-container'),this.episode_doms[keys.episode_selection],'horizontal',false)
            }
        }else{
            if(keys.focused_part==='control_bar' || keys.focused_part==='info_bar' || keys.focused_part==='slider'){
                this.showControlBar(false);
                $(this.video_control_doms).removeClass('active');
                $(this.video_info_doms).removeClass('active');
                keys.focused_part='slider';
                keys.prev_focus='slider';
                $('#vod-series-progress-container .rangeslider').addClass('active');
                this.seekTo(increment*30);
            }
        }
        if(keys.focused_part==="subtitle_audio_selection_modal"){
            if(increment>0)
                keys.subtitle_audio_selection_modal=this.subtitle_audio_menus.length-1;
            else
                keys.subtitle_audio_selection_modal=this.subtitle_audio_menus.length-2;
            this.hoverSubtitleAudioModal(keys.subtitle_audio_selection_modal);
        }
    },
    handleMenuUpDown:function(increment){
        var buttons=$('#vod-series-player-operation-modal').find('.modal-operation-menu-type-1');
        var keys=this.keys;
        if((keys.focused_part==="control_bar" || keys.focused_part==='info_bar' || keys.focused_part==='slider' || keys.focused_part==='episode_selection') && !this.show_control) {
            // clearTimeout(this.timeOut)
            this.showControlBar(true);
            // this.showNextVideo(increment);
        }
        if(this.show_control){
            this.showControlBar(false);
            switch (keys.focused_part) {
                case 'slider':
                    if(increment>0){
                        this.removeAllActiveClass(true);
                        keys.focused_part='control_bar';
                        keys.prev_focus='control_bar';
                        keys.control_bar=2;
                        $(this.video_control_doms).removeClass('active');
                        $(this.video_info_doms).removeClass('active');
                        $(this.video_control_doms[2]).addClass('active');
                        $('#vod-series-progress-container .rangeslider').removeClass('active');
                    }
                    break;
                case 'control_bar':
                    this.removeAllActiveClass(true);
                    if(increment>0){
                        keys.focused_part='info_bar';
                        keys.prev_focus='info_bar';
                        keys.info_bar=0;
                        $(this.video_info_doms[keys.info_bar]).addClass('active');
                    }else{
                        keys.focused_part='slider';
                        keys.prev_focus='slider';
                        $('#vod-series-progress-container .rangeslider').addClass('active');
                        $(this.video_control_doms).removeClass('active');
                        $(this.video_info_doms).removeClass('active');
                    }
                    break;
                case 'info_bar':
                    if(increment<0){
                        this.removeAllActiveClass(true);
                        $(this.video_control_doms).removeClass('active');
                        $(this.video_info_doms).removeClass('active');
                        keys.focused_part='control_bar';
                        keys.prev_focus='control_bar';
                        keys.control_bar=2;
                        $(this.video_control_doms[2]).addClass('active');
                    }
                    else if(this.has_episodes){
                        this.removeAllActiveClass(true);
                        $(this.video_control_doms).removeClass('active');
                        $(this.video_info_doms).removeClass('active');
                        $('#player-seasons-container').addClass('expanded');
                        keys.focused_part='episode_selection';
                        keys.prev_focus='episode_selection';
                        $(this.episode_doms[keys.episode_selection]).addClass('active');
                        moveScrollPosition($('#player-seasons-container'),this.episode_doms[keys.episode_selection],'horizontal',false)
                    }
                    break;
                case 'episode_selection':
                    if(increment<0){
                        this.removeAllActiveClass(true);
                        $('#player-seasons-container').removeClass('expanded');
                        keys.focused_part='info_bar';
                        $(this.episode_doms).removeClass('active');
                        $(this.video_info_doms[keys.info_bar]).addClass('active');
                    }
                    break;
            }
        }
        if(keys.focused_part==="operation_modal"){
            keys.operation_modal+=increment;
            if(keys.operation_modal<0)
                keys.operation_modal=buttons.length-1;
            if(keys.operation_modal>=buttons.length)
                keys.operation_modal=0;
            $(buttons).removeClass('active');
            $(buttons[keys.operation_modal]).addClass('active');
        }
        if(keys.focused_part==="subtitle_audio_selection_modal"){
            if(keys.subtitle_audio_selection_modal<this.subtitle_audio_menus.length-2)
                keys.subtitle_audio_selection_modal+=increment;
            if(keys.subtitle_audio_selection_modal>=this.subtitle_audio_menus.length-2 && increment<0)
                keys.subtitle_audio_selection_modal=this.subtitle_audio_menus.length-3;
            if(keys.subtitle_audio_selection_modal<0){
                keys.subtitle_audio_selection_modal=0;
                return;
            }
            if(keys.subtitle_audio_selection_modal>=this.subtitle_audio_menus.length)
                keys.subtitle_audio_selection_modal=this.subtitle_audio_menus.length-1;
            this.hoverSubtitleAudioModal(keys.subtitle_audio_selection_modal);
        }
        if(keys.focused_part==='resume_bar'){
            var resume_bar_doms=this.resume_bar_doms;
            keys.resume_bar+=increment;
            if(keys.resume_bar<0)
                keys.resume_bar=resume_bar_doms.length-1;
            if(keys.resume_bar>=resume_bar_doms.length)
                keys.resume_bar=0;
            $(resume_bar_doms).removeClass('active');
            $(resume_bar_doms[keys.resume_bar]).addClass('active');
            clearTimeout(this.resume_timer);
            this.resume_timer=setTimeout(function () {
                $('#video-resume-modal').hide();
                keys.focused_part=keys.prev_focus;
            },15000)
        }
    },
    HandleKey:function (e) {
        switch (e.keyCode) {
            case tvKey.MediaFastForward:
                this.seekTo(30);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1)
                break;
            case tvKey.MediaRewind:
                this.seekTo(-30)
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1)
                break;
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.MediaPause:
                this.playPauseVideo("");
                break;
            case tvKey.MediaPlay:
                this.playPauseVideo("");
                break;
            case tvKey.MediaPlayPause:
                this.playPauseVideo("");
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.YELLOW:
                if(this.current_movie_type==="movies"){
                    if(!current_movie.is_favourite){
                        VodModel.addRecentOrFavouriteMovie(current_movie, 'favourite');
                        current_movie.is_favourite=true;
                    }
                    else{
                        VodModel.removeRecentOrFavouriteMovie(current_movie.stream_id,"favourite");
                        current_movie.is_favourite=false;
                    }
                }
                else{
                    if(!current_series.is_favourite){
                        SeriesModel.addRecentOrFavouriteMovie(current_series, 'favourite');
                        current_series.is_favourite=true;
                    }
                    else{
                        SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,"favourite");
                        current_series.is_favourite=false;
                    }
                }
                break;
            case tvKey.BLUE:
                this.Exit();
                if(this.current_movie_type==="series")
                    goHomePageWithMovieType("live-tv");
                else
                    goHomePageWithMovieType("series");
                break;
        }
    }
}

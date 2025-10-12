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
        this.last_key_time=0;
        this.video_duration=0;
        var that=this;
        this.resume_bar_doms=$('#video-resume-modal .resume-action-btn');
        var keys=this.keys;
        this.current_movie=movie;
        this.current_movie_type=movie_type;
        
        // Check if content is blocked
        var contentName = movie.name || movie.title || '';
        var contentType = movie_type === 'movies' ? 'movie' : (movie_type === 'series' ? 'series' : '');
        if(contentType && isContentBlocked(contentName, contentType)) {
            showToast("Access Denied", "This content is restricted");
            console.log('🚫 Content blocked:', contentName);
            this.goBack();
            return;
        }
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
            }
        }
        try{
            media_player.close();
        }catch (e) {
        }
        try{
            media_player.init("vod-series-player-video","vod-series-player-page");
            setTimeout(function(){
                try{
                    media_player.setDisplayArea();
                }catch(e){
                }
            }, 250);
        }catch (e) {
        }
        try{
            media_player.playAsync(url);
        }catch (e) {
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
            if(duration-current_time>=dt){
                if(this.current_movie_type==='movies')
                {
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
        if(keys.focused_part==="subtitle_position_overlay"){
            this.cancelSubtitlePosition();
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
        }else if(action_type==='stop'){
            try{
                media_player.stop();
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
    
    makeEnhancedMediaTrackElement: function(items, kind) {
        // Enhanced track element creation for combined subtitle list
        var htmlContent = "";
        var that = this;
        
        items.forEach(function(item, index) {
            var label = item.label || 'Track ' + (index + 1);
            var language = item.language || 'unknown';
            var source = item.source || 'api';
            
            // Source indicator removed as requested - clean labels only
            
            htmlContent += 
                '<div class="modal-operation-menu-type-2 subtitle-option"\
                    onmouseenter="vod_series_player.hoverSubtitleAudioModal(' + index + ')" \
                    onclick="vod_series_player.handleMenuClick()" \
                >\
                    <input class="magic-radio" type="radio" name="radio"\
                        value="' + index + '">\
                    <label>' + label + '</label>\
                </div>';
        });
        
        return htmlContent;
    },
    showSubtitleAudioModal:function(kind){
        this.hideControlBar();
        var keys=this.keys;
        if(keys.focused_part!="subtitle_audio_selection_modal")
            keys.prev_focus=keys.focused_part;
        try{
            $('#subtitle-loader-container').hide();
            var subtitles;
            // Enhanced subtitle workflow integration
            if(kind === 'TEXT') {
                if(!this.subtitle_loaded) {
                    $("#subtitle-selection-container").html('');
                    if(!(this.current_movie_type==='movies' || (this.current_movie_type==='series' && settings.playlist_type==='xtreme')))
                    {
                        this.showEmptySubtitleMessage(kind);
                        return;
                    }
                    
                    var that = this;
                    this.subtitle_loading = true;
                    $('#subtitle-selection-modal').modal('show');
                    this.hoverSubtitleAudioModal(-2);
                    $('#subtitle-loader-container').show();
                    
                    // Prepare movie data for enhanced workflow
                    var movieData, movieType;
                    if(this.current_movie_type === 'movies') {
                        movieData = {
                            name: this.current_movie.name,
                            tmdb_id: this.current_movie.tmdb_id
                        };
                        movieType = 'movie';
                    } else {
                        var episode = current_season.episodes[episode_variable.keys.index];
                        // Pass the complete episode object with all TMDB data and series info
                        movieData = {
                            name: episode.title || episode.name,  // Episode name
                            title: episode.title,
                            episode_name: episode.title, 
                            info: episode.info,  // Contains episode TMDB ID
                            series_tmdb_id: episode.series_tmdb_id,  // Series TMDB ID fallback
                            // Add series info for fallback subtitle matching
                            series_name: current_series.name,  // Full series name
                            season: episode.season || current_season.season_number || 1,  // Season number
                            episode_num: episode.episode_num || (episode_variable.keys.index + 1)  // Episode number
                        };
                        movieType = 'episode';
                    }
                    
                    // Use enhanced subtitle workflow
                    EnhancedSubtitleWorkflow.initializeSubtitles(movieData, movieType,
                        function(subtitles) {
                            // Success callback - store combined subtitles
                            that.subtitle_loading = false;
                            that.subtitle_loaded = true;
                            $('#subtitle-loader-container').hide();
                            
                            // Store the combined subtitles in media_player for global access
                            media_player.subtitles = subtitles;
                            
                            if(subtitles && subtitles.length > 0) {
                                that.renderEnhancedSubtitles(kind, subtitles);
                            } else {
                                that.showEmptySubtitleMessage(kind);
                            }
                        },
                        function(error) {
                            // Error callback
                            that.subtitle_loading = false;
                            that.subtitle_loaded = true;
                            $('#subtitle-loader-container').hide();
                            that.showEmptySubtitleMessage(kind);
                        }
                    );
                } else {
                    if(media_player.subtitles && media_player.subtitles.length > 0) {
                        this.renderEnhancedSubtitles(kind, media_player.subtitles);
                    } else {
                        this.showEmptySubtitleMessage(kind);
                    }
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
    
    // Subtitle cache per content ID to avoid repeated API calls
    subtitleCache: {},
    
    // Clean old cache entries to prevent memory leaks
    cleanSubtitleCache: function() {
        var now = Date.now();
        var maxAge = 10 * 60 * 1000; // 10 minutes
        
        for(var key in this.subtitleCache) {
            if(this.subtitleCache.hasOwnProperty(key)) {
                var entry = this.subtitleCache[key];
                if(now - entry.timestamp > maxAge) {
                    delete this.subtitleCache[key];
                }
            }
        }
    },
    
    // Get cached subtitles if available
    getCachedSubtitles: function(contentId) {
        if(contentId && this.subtitleCache[contentId]) {
            var entry = this.subtitleCache[contentId];
            var maxAge = 10 * 60 * 1000; // 10 minutes
            
            if(Date.now() - entry.timestamp < maxAge) {
                return entry;
            } else {
                // Remove expired entry
                delete this.subtitleCache[contentId];
            }
        }
        return null;
    },
    
    // Performance-optimized subtitle rendering with caching
    renderEnhancedSubtitles: function(kind, subtitles, contentId) {
        var keys = this.keys;
        if(keys.focused_part === 'resume_bar') {
            $('#subtitle-selection-modal').modal('hide');
            return;
        }
        
        // Check cache first for instant rendering
        var cachedData = null;
        if(contentId) {
            cachedData = this.getCachedSubtitles(contentId);
            if(cachedData && cachedData.kind === kind) {
                subtitles = cachedData.subtitles;
            }
        }
        
        // Cache subtitle data for future reopening
        if(contentId && subtitles && !cachedData) {
            // Clean old cache entries periodically
            this.cleanSubtitleCache();
            
            this.subtitleCache[contentId] = {
                subtitles: subtitles,
                kind: kind,
                timestamp: Date.now()
            };
        }
        
        // Set modal title and state
        if(kind == "TEXT")
            $("#subtitle-modal-title").text("Subtitle");
        else
            $("#subtitle-modal-title").text("Audio Track");
            
        keys.focused_part = "subtitle_audio_selection_modal";
        
        // Optimized DOM rendering - build in memory first
        var container = document.getElementById('subtitle-selection-container');
        container.style.display = 'none'; // Hide during update to prevent reflow
        
        var htmlContent = this.makeEnhancedMediaTrackElement(subtitles, kind);
        container.innerHTML = htmlContent;
        
        // Batch DOM updates in requestAnimationFrame
        var that = this;
        requestAnimationFrame(function() {
            container.style.display = ''; // Show after update
            
            // Setup event delegation instead of individual handlers
            that.setupSubtitleEventDelegation();
            
            // Initialize modal with animation
            $('#subtitle-selection-modal').addClass('show').modal('show');
            
            var subtitle_menus = $('.subtitle-option');
            that.subtitle_audio_menus = subtitle_menus;
            
            // Set default selection (Off/None) - batch class updates
            that.setActiveSubtitleOption(0, subtitle_menus);
            keys.subtitle_audio_selection_modal = 0;
            
            // Find and set current selection if applicable
            var current_selected_index = kind === "TEXT" ? that.current_subtitle_index : that.current_audio_track_index;
            
            if(current_selected_index !== undefined && current_selected_index !== null && 
               current_selected_index >= 0 && current_selected_index < subtitle_menus.length) {
                that.setActiveSubtitleOption(current_selected_index, subtitle_menus);
                keys.subtitle_audio_selection_modal = current_selected_index;
            }
        });
    },
    
    // Optimized batch selection update
    setActiveSubtitleOption: function(index, options) {
        // Batch DOM updates to minimize reflow
        var that = this;
        requestAnimationFrame(function() {
            options.removeClass('active selected focused');
            options.find('input').prop('checked', false);
            
            if(index >= 0 && index < options.length) {
                $(options[index]).addClass('active focused');
                $(options[index]).find('input').prop('checked', true);
            }
        });
    },
    
    // Setup event delegation for better performance  
    setupSubtitleEventDelegation: function() {
        var that = this;
        var container = $('#subtitle-selection-container');
        
        // Remove any existing delegation to avoid duplicates
        container.off('focus mouseenter click', '.subtitle-option');
        
        // Use event delegation with proper throttling
        var lastUpdate = 0;
        var throttleDelay = 16; // ~60fps
        
        container.on('focus mouseenter', '.subtitle-option', function(e) {
            e.preventDefault();
            
            var now = Date.now();
            if(now - lastUpdate < throttleDelay) {
                return; // Throttle to 60fps
            }
            lastUpdate = now;
            
            var index = $('.subtitle-option').index(this);
            
            // Use rAF for smooth DOM updates
            requestAnimationFrame(function() {
                that.hoverSubtitleAudioModal(index);
            });
        });
        
        // Handle click events
        container.on('click', '.subtitle-option', function(e) {
            e.preventDefault();
            var index = $('.subtitle-option').index(this);
            that.hoverSubtitleAudioModal(index);
            that.confirmSubtitle();
        });
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
            // Enhanced subtitle selection with workflow integration
            this.current_subtitle_index=$('#subtitle-selection-modal').find('input[type=radio]:checked').val();
            var selectedIndex = parseInt(this.current_subtitle_index);
            
            
            // Use enhanced subtitle workflow for selection
            var that = this;
            EnhancedSubtitleWorkflow.selectSubtitle(selectedIndex,
                function() {
                    // Loading callback
                },
                function() {
                    // Success callback
                    $("#vod-series-player-page").find('.subtitle-container').css({visibility:'visible'});
                },
                function(error) {
                    // Error callback
                    showToast("Error", "Failed to load subtitle");
                }
            );
        }
        else{
            // Audio track selection (unchanged)
            this.current_audio_track_index=$('#subtitle-selection-modal').find('input[type=radio]:checked').val();
            try{
                media_player.setSubtitleOrAudioTrack("AUDIO",parseInt(this.current_audio_track_index))
            }catch(e){
            }
        }
    },
    
    // Settings Modal Function
    showSettingsModal: function() {
        this.hideControlBar();
        var keys = this.keys;
        if(keys.focused_part != "operation_modal") {
            keys.prev_focus = keys.focused_part;
        }
        keys.focused_part = "operation_modal";
        keys.operation_modal = 0;
        
        // Show the settings modal
        $('#vod-series-player-operation-modal').modal('show');
        
        // Set focus to first option
        var buttons = $('#vod-series-player-operation-modal').find('.modal-operation-menu-type-1');
        $(buttons).removeClass('active');
        $(buttons[0]).addClass('active');
    },
    
    // Subtitle Position Functions
    showSubtitlePositionModal: function() {
        this.hideControlBar();
        var keys = this.keys;
        if(keys.focused_part != "subtitle_position_overlay") {
            keys.prev_focus = keys.focused_part;
        }
        keys.focused_part = "subtitle_position_overlay";
        
        // Store original settings for cancel functionality
        this.originalSubtitlePosition = parseInt(localStorage.getItem('subtitle_position') || '10');
        this.originalSubtitleLevel = this.getSubtitleLevel();
        this.originalSubtitleSize = this.SUBTITLE_LEVELS.SIZES[this.originalSubtitleLevel];
        this.originalSubtitleBackground = localStorage.getItem('subtitle_background') || 'black';
        
        this.currentSubtitlePosition = this.originalSubtitlePosition;
        this.currentSubtitleSize = this.originalSubtitleSize;
        this.currentSubtitleBackground = this.originalSubtitleBackground;
        
        this.updateAllDisplays();
        
        // Hide movie player operation modal and show position overlay
        $('#vod-series-player-operation-modal').modal('hide');
        $('#subtitle-position-overlay').show();
        
        // Initialize focus
        this.positionControlIndex = 0;
        this.hoverPositionControl(0);
    },
    
    adjustSubtitlePosition: function(direction) {
        var step = 2; // 2vh adjustment for smoother control
        if(direction === 'up') {
            this.currentSubtitlePosition = Math.min(50, this.currentSubtitlePosition + step);
        } else if(direction === 'down') {
            // Remove bottom limit - allow subtitles to go to very bottom
            this.currentSubtitlePosition = Math.max(-5, this.currentSubtitlePosition - step);
        }
        
        // Auto-save to localStorage immediately
        localStorage.setItem('subtitle_position', this.currentSubtitlePosition);
        
        this.applyLiveSubtitleStyles();
        this.updateAllDisplays();
    },
    
    setSubtitlePosition: function(position) {
        this.currentSubtitlePosition = parseInt(position);
        
        // Auto-save to localStorage immediately
        localStorage.setItem('subtitle_position', this.currentSubtitlePosition);
        
        this.applyLiveSubtitleStyles();
        this.updateAllDisplays();
    },
    
    // Subtitle size level constants
    SUBTITLE_LEVELS: {
        MIN: 0,
        MAX: 4,
        DEFAULT: 2,
        SIZES: [14, 18, 24, 32, 40] // small, normal, large, extra-large, maximum
    },
    
    getSubtitleLevel: function() {
        var level = parseInt(localStorage.getItem('subtitle_level') || this.SUBTITLE_LEVELS.DEFAULT);
        return Number.isFinite(level) ? Math.max(this.SUBTITLE_LEVELS.MIN, Math.min(this.SUBTITLE_LEVELS.MAX, level)) : this.SUBTITLE_LEVELS.DEFAULT;
    },
    
    setSubtitleLevel: function(level) {
        level = Math.max(this.SUBTITLE_LEVELS.MIN, Math.min(this.SUBTITLE_LEVELS.MAX, level));
        localStorage.setItem('subtitle_level', level);
        this.currentSubtitleSize = this.SUBTITLE_LEVELS.SIZES[level];
        localStorage.setItem('subtitle_size', this.currentSubtitleSize); // Keep for backward compatibility
        this.applyLiveSubtitleStyles();
        this.updateAllDisplays();
    },
    
    adjustSubtitleSize: function(direction) {
        var currentLevel = this.getSubtitleLevel();
        if(direction === 'larger') {
            this.setSubtitleLevel(currentLevel + 1); // Automatically clamped to MAX
        } else if(direction === 'smaller') {
            this.setSubtitleLevel(currentLevel - 1); // Automatically clamped to MIN
        }
    },
    
    setSubtitleSize: function(size) {
        // Convert absolute size to level for consistent handling
        var level = this.SUBTITLE_LEVELS.SIZES.indexOf(parseInt(size));
        if(level === -1) {
            // If size not in presets, find closest level
            var targetSize = parseInt(size);
            level = this.SUBTITLE_LEVELS.DEFAULT;
            var minDiff = Infinity;
            for(var i = 0; i < this.SUBTITLE_LEVELS.SIZES.length; i++) {
                var diff = Math.abs(this.SUBTITLE_LEVELS.SIZES[i] - targetSize);
                if(diff < minDiff) {
                    minDiff = diff;
                    level = i;
                }
            }
        }
        this.setSubtitleLevel(level);
    },
    
    setSubtitleBackground: function(bgType) {
        this.currentSubtitleBackground = bgType;
        
        // Auto-save to localStorage immediately
        localStorage.setItem('subtitle_background', this.currentSubtitleBackground);
        
        this.applyLiveSubtitleStyles();
        this.updateAllDisplays();
    },
    
    applyLiveSubtitleStyles: function() {
        // Apply all subtitle styles in real-time
        var position = this.currentSubtitlePosition;
        var size = this.currentSubtitleSize;
        var bgType = this.currentSubtitleBackground;
        
        // Get background style
        var backgroundStyle = this.getBackgroundStyle(bgType);
        
        // Apply to subtitle containers
        $('#' + media_player.parent_id).find('.subtitle-container').css({
            'bottom': position + 'vh',
            'top': 'auto',
            'font-size': size + 'px',
            'background': backgroundStyle.background,
            'color': backgroundStyle.color,
            'text-shadow': backgroundStyle.textShadow,
            'padding': backgroundStyle.padding,
            'border-radius': backgroundStyle.borderRadius
        });
        
        // Also apply to any custom subtitle displays
        $('.subtitle-text, .subtitle-display').css({
            'bottom': position + 'vh',
            'top': 'auto',
            'font-size': size + 'px',
            'background': backgroundStyle.background,
            'color': backgroundStyle.color,
            'text-shadow': backgroundStyle.textShadow,
            'padding': backgroundStyle.padding,
            'border-radius': backgroundStyle.borderRadius,
            'box-shadow': backgroundStyle.boxShadow || 'none', // Add box-shadow control
            'border': backgroundStyle.border || 'none'        // Add border control
        });
    },
    
    getBackgroundStyle: function(bgType) {
        switch(bgType) {
            case 'transparent':
                return {
                    background: 'transparent',
                    color: '#fff',
                    textShadow: 'none', // Remove shadow for true transparency
                    padding: '0px',     // Remove padding to avoid any borders
                    borderRadius: '0px',
                    border: 'none',     // Remove any borders
                    boxShadow: 'none',  // Remove any shadows
                    outline: 'none'     // Remove any outlines
                };
            case 'black':
                return {
                    background: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    textShadow: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: 'none',
                    border: 'none'
                };
            case 'gray':
                return {
                    background: 'rgba(255,0,0,0.8)', // Changed grey to red
                    color: '#fff',
                    textShadow: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: 'none',
                    border: 'none'
                };
            case 'dark':
                return {
                    background: 'rgba(0,128,0,0.8)', // Changed dark to green
                    color: '#fff',
                    textShadow: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: 'none',
                    border: 'none'
                };
            default:
                return this.getBackgroundStyle('black');
        }
    },
    
    updateAllDisplays: function() {
        $('#position-value').text(this.currentSubtitlePosition + 'vh');
        $('#size-value').text(this.currentSubtitleSize + 'px');
        
        var bgLabels = {
            'transparent': 'None',
            'black': 'Black',
            'gray': 'Red', // Updated label from Gray to Red
            'dark': 'Green' // Updated label from Dark to Green
        };
        $('#background-value').text(bgLabels[this.currentSubtitleBackground] || 'Black');
    },
    
    hoverPositionControl: function(index) {
        this.positionControlIndex = index;
        
        // Remove active classes
        $('.position-button, .preset-button, .position-action-btn, .size-button, .bg-color-button').removeClass('active');
        
        // Add active class to selected element
        if(index >= 0 && index < 2) {
            // Position buttons (up/down)
            $('.position-button').eq(index).addClass('active');
        } else if(index >= 2 && index < 6) {
            // Position preset buttons
            $('.preset-button').eq(index - 2).addClass('active');
        } else if(index >= 6 && index < 8) {
            // Size buttons (smaller/larger)
            $('.size-button').eq(index - 6).addClass('active');
        } else if(index >= 8 && index < 12) {
            // Size preset buttons
            $('.size-presets .preset-button').eq(index - 8).addClass('active');
        } else if(index >= 12 && index < 16) {
            // Background color buttons
            $('.bg-color-button').eq(index - 12).addClass('active');
        } else if(index >= 16) {
            // Save/Cancel buttons
            $('.position-action-btn').eq(index - 16).addClass('active');
        }
    },
    
    saveSubtitlePosition: function() {
        // Settings are already auto-saved, just close overlay and confirm global save
        $('#subtitle-position-overlay').hide();
        this.keys.focused_part = "control_bar";
        
        showToast("Success", "Subtitle settings saved globally!");
    },
    
    cancelSubtitlePosition: function() {
        // Reset to original settings
        this.currentSubtitlePosition = this.originalSubtitlePosition;
        this.currentSubtitleSize = this.originalSubtitleSize;
        this.currentSubtitleBackground = this.originalSubtitleBackground;
        // Reset level storage to match
        var level = this.SUBTITLE_LEVELS.SIZES.indexOf(this.originalSubtitleSize);
        if(level !== -1) {
            localStorage.setItem('subtitle_level', level);
        }
        this.applyLiveSubtitleStyles();
        
        // Close overlay and return to player
        $('#subtitle-position-overlay').hide();
        this.keys.focused_part = "control_bar";
    },
    
    applySubtitlePosition: function() {
        // Apply all saved subtitle settings on initial load
        var position = parseInt(localStorage.getItem('subtitle_position') || '10');
        var level = this.getSubtitleLevel();
        var size = this.SUBTITLE_LEVELS.SIZES[level];
        var bgType = localStorage.getItem('subtitle_background') || 'black';
        
        this.currentSubtitlePosition = position;
        this.currentSubtitleSize = size;
        this.currentSubtitleBackground = bgType;
        
        this.applyLiveSubtitleStyles();
        
        // Also ensure srt_operation uses these settings for future subtitle display
        if(typeof srt_operation !== 'undefined') {
            srt_operation.applyUserStyles();
        }
    },
    
    // Helper functions for 2D navigation in subtitle position overlay
    getControlRow: function(index) {
        if(index >= 0 && index <= 1) return 'position'; // Position up/down
        if(index >= 2 && index <= 5) return 'position_presets'; // Position presets (bottom, middle, center, upper)
        if(index >= 6 && index <= 7) return 'size'; // Size larger/smaller
        if(index >= 8 && index <= 11) return 'size_presets'; // Size presets (small, medium, large, extra-large)
        if(index >= 12 && index <= 15) return 'background'; // Background options
        if(index >= 16 && index <= 17) return 'action'; // Save/Cancel buttons
        return 'position'; // Default fallback
    },
    
    getRowRange: function(row) {
        switch(row) {
            case 'position': return { start: 0, end: 1 };
            case 'position_presets': return { start: 2, end: 5 };
            case 'size': return { start: 6, end: 7 };
            case 'size_presets': return { start: 8, end: 11 };
            case 'background': return { start: 12, end: 15 };
            case 'action': return { start: 16, end: 17 };
            default: return { start: 0, end: 1 };
        }
    },
    
    getColumnInRow: function(index) {
        // Calculate column position within the current row (0-based)
        var row = this.getControlRow(index);
        var range = this.getRowRange(row);
        return index - range.start;
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
    // Throttled hover handler for better performance
    hoverTimeout: null,
    lastHoveredIndex: -1,
    
    hoverSubtitleAudioModal: function(index) {
        var keys = this.keys;
        
        // Skip if same index to avoid unnecessary DOM updates
        if(index === this.lastHoveredIndex) {
            return;
        }
        this.lastHoveredIndex = index;
        
        if(index >= 0) {
            keys.subtitle_audio_selection_modal = index;
            
            // Batch DOM updates for better performance
            var that = this;
            requestAnimationFrame(function() {
                if(that.subtitle_audio_menus && that.subtitle_audio_menus.length > 0) {
                    $(that.subtitle_audio_menus).removeClass('active focused');
                    if(index < that.subtitle_audio_menus.length) {
                        $(that.subtitle_audio_menus[index]).addClass('active focused');
                        // Only scroll if needed - throttled
                        moveScrollPosition($('#subtitle-selection-container'), that.subtitle_audio_menus[index], 'vertical', false);
                    }
                }
            });
        } else {
            // Handle negative indexes (buttons)
            keys.subtitle_audio_selection_modal = this.subtitle_audio_menus.length + index;
            var that = this;
            requestAnimationFrame(function() {
                if(that.subtitle_audio_menus) {
                    $(that.subtitle_audio_menus).removeClass('active focused');
                    var targetIndex = that.subtitle_audio_menus.length + index;
                    if(targetIndex >= 0 && targetIndex < that.subtitle_audio_menus.length) {
                        $(that.subtitle_audio_menus[targetIndex]).addClass('active focused');
                    }
                }
            });
        }
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
        else if(keys.focused_part==="subtitle_position_overlay"){
            // Handle subtitle position overlay clicks
            if(this.positionControlIndex >= 0 && this.positionControlIndex < 2) {
                // Position buttons (up/down)
                var direction = this.positionControlIndex === 0 ? 'up' : 'down';
                this.adjustSubtitlePosition(direction);
            } else if(this.positionControlIndex >= 2 && this.positionControlIndex < 6) {
                // Position preset buttons
                var presets = [2, 20, 30, 40]; // bottom, middle, center, upper
                this.setSubtitlePosition(presets[this.positionControlIndex - 2]);
            } else if(this.positionControlIndex >= 6 && this.positionControlIndex < 8) {
                // Size buttons (smaller/larger)
                var direction = this.positionControlIndex === 6 ? 'smaller' : 'larger';
                this.adjustSubtitleSize(direction);
            } else if(this.positionControlIndex >= 8 && this.positionControlIndex < 12) {
                // Size preset buttons
                var sizePresets = [14, 18, 24, 32]; // small, normal, large, extra large
                this.setSubtitleSize(sizePresets[this.positionControlIndex - 8]);
            } else if(this.positionControlIndex >= 12 && this.positionControlIndex < 16) {
                // Background buttons
                var bgTypes = ['transparent', 'black', 'gray', 'dark'];
                this.setSubtitleBackground(bgTypes[this.positionControlIndex - 12]);
            } else if(this.positionControlIndex === 16) {
                // Save button
                this.saveSubtitlePosition();
            } else if(this.positionControlIndex === 17) {
                // Cancel button
                this.cancelSubtitlePosition();
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
        if(keys.focused_part==="subtitle_position_overlay"){
            // Navigate horizontally within the same control row
            var currentRow = this.getControlRow(this.positionControlIndex);
            var rowRange = this.getRowRange(currentRow);
            
            if(increment>0) {
                // Move right within same row
                if(this.positionControlIndex < rowRange.end) {
                    this.positionControlIndex++;
                } else {
                    // Wrap to start of row
                    this.positionControlIndex = rowRange.start;
                }
            } else {
                // Move left within same row
                if(this.positionControlIndex > rowRange.start) {
                    this.positionControlIndex--;
                } else {
                    // Wrap to end of row
                    this.positionControlIndex = rowRange.end;
                }
            }
            this.hoverPositionControl(this.positionControlIndex);
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
        else if(keys.focused_part==="subtitle_position_overlay"){
            // Simple column-based down navigation: up->bottom->smaller->small->none->save
            // Left/right navigation works within each row
            var currentIndex = this.positionControlIndex;
            
            if(increment > 0) {
                // Down navigation paths: up→bottom→center→smaller→small path AND down→middle→upper→large→normal→extra-large→black→dark→cancel path
                switch(currentIndex) {
                    // Main up path: up→bottom→center→smaller→small→large→none→gray→save
                    case 0: this.positionControlIndex = 2; break; // up → bottom
                    case 2: this.positionControlIndex = 4; break; // bottom → center
                    case 4: this.positionControlIndex = 6; break; // center → smaller
                    case 6: this.positionControlIndex = 8; break; // smaller → small
                    case 8: this.positionControlIndex = 10; break; // small → large
                    case 10: this.positionControlIndex = 12; break; // large → none (from up path)
                    case 12: this.positionControlIndex = 14; break; // none → gray
                    case 14: this.positionControlIndex = 16; break; // gray → save
                    
                    // Main down path: down→middle→upper→larger→normal→extra-large→black→dark→cancel
                    case 1: this.positionControlIndex = 3; break; // down → middle
                    case 3: this.positionControlIndex = 5; break; // middle → upper
                    case 5: this.positionControlIndex = 7; break; // upper → larger
                    case 7: this.positionControlIndex = 9; break; // larger → normal
                    case 9: this.positionControlIndex = 11; break; // normal → extra-large
                    case 11: this.positionControlIndex = 13; break; // extra-large → black
                    case 13: this.positionControlIndex = 15; break; // black → dark
                    case 15: this.positionControlIndex = 17; break; // dark → cancel
                    
                    // Other navigation points
                    case 16: this.positionControlIndex = 0; break; // save → up (wrap)
                    case 17: this.positionControlIndex = 1; break; // cancel → down (wrap)
                    default: this.positionControlIndex = 0; break; // fallback
                }
            } else {
                // Up navigation (reverse paths)
                switch(currentIndex) {
                    // Reverse up path: save→gray→none→large→small→smaller→center→bottom→up
                    case 16: this.positionControlIndex = 14; break; // save → gray
                    case 14: this.positionControlIndex = 12; break; // gray → none
                    case 12: this.positionControlIndex = 10; break; // none → large
                    case 10: this.positionControlIndex = 8; break; // large → small
                    case 8: this.positionControlIndex = 6; break; // small → smaller
                    case 6: this.positionControlIndex = 4; break; // smaller → center
                    case 4: this.positionControlIndex = 2; break; // center → bottom
                    case 2: this.positionControlIndex = 0; break; // bottom → up
                    case 0: this.positionControlIndex = 16; break; // up → save (wrap)
                    
                    // Reverse down path: cancel→dark→black→extra-large→normal→larger→upper→middle→down
                    case 17: this.positionControlIndex = 15; break; // cancel → dark
                    case 15: this.positionControlIndex = 13; break; // dark → black
                    case 13: this.positionControlIndex = 11; break; // black → extra-large
                    case 11: this.positionControlIndex = 9; break; // extra-large → normal
                    case 9: this.positionControlIndex = 7; break; // normal → larger
                    case 7: this.positionControlIndex = 5; break; // larger → upper
                    case 5: this.positionControlIndex = 3; break; // upper → middle
                    case 3: this.positionControlIndex = 1; break; // middle → down
                    case 1: this.positionControlIndex = 17; break; // down → cancel (wrap)
                    
                    // Other items (no conflicts with main paths)
                    default: this.positionControlIndex = 0; break; // fallback
                }
            }
            
            this.hoverPositionControl(this.positionControlIndex);
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
                this.playPauseVideo("pause");
                break;
            case tvKey.MediaPlay:
                this.playPauseVideo("play");
                break;
            case tvKey.MediaPlayPause:
                this.playPauseVideo("");
                break;
            case tvKey.MediaStop:
                this.playPauseVideo("stop");
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

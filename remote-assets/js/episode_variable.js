"use strict";
var episode_variable={
    keys:{
        focused_part:'grid_part',
        index:0
    },
    episode_doms:[],
    init:function(){
        var bgImg = current_season.cover || current_series.cover || '';
        $('#episode-page-background').attr('src', bgImg);
        if(current_season.episodes && current_season.episodes.length > 0){
            this.updateDetailPane(0);
        }
    },
    renderEpisodes:function(){
        var htmlContent="";
        var episodes = current_season.episodes || [];
        episodes.forEach(function(episode, index){
            var thumbImg = episode.info && episode.info.movie_image ? episode.info.movie_image : 
                           (episode.cover_big || current_season.cover || current_series.cover || 'images/series.png');
            var title = episode.title || episode.name || ('Episode ' + (index + 1));
            htmlContent+=
                '<div class="episode-rail-card" data-index="'+index+'" '+
                    'onclick="episode_variable.showMovie('+index+')" '+
                    'onmouseenter="episode_variable.hoverMovie('+index+')">'+
                    '<img class="episode-rail-thumb" src="'+thumbImg+'" onerror="this.src=\'images/series.png\'">'+
                    '<div class="episode-rail-info">'+
                        '<p class="episode-rail-number">Episode '+(index + 1)+'</p>'+
                        '<p class="episode-rail-title">'+title+'</p>'+
                    '</div>'+
                '</div>';
        });
        $('#episode-grid-container').html(htmlContent);
        this.episode_doms = $('.episode-rail-card');
    },
    updateDetailPane:function(index){
        var episodes = current_season.episodes || [];
        if(index < 0 || index >= episodes.length) return;
        var episode = episodes[index];
        var title = episode.title || episode.name || ('Episode ' + (index + 1));
        var description = (episode.info && episode.info.plot) || '';
        var duration = (episode.info && episode.info.duration) || '';
        var bgImg = (episode.info && episode.info.movie_image) || 
                    episode.cover_big || current_season.cover || current_series.cover || '';
        $('#focused-episode-number').text('Episode ' + (index + 1));
        $('#focused-episode-title').text(title);
        $('#focused-episode-description').text(description);
        $('#focused-episode-duration').text(duration);
        $('#episode-page-background').attr('src', bgImg);
    },
    Exit:function(){
        $('#episode-page').hide();
    },
    hoverGoBack:function(){
        this.keys.focused_part="back_button";
        $(this.episode_doms).removeClass('active');
        $('#episode-watch-btn').removeClass('active');
        $('#episode-page-back-button').addClass('active');
    },
    hoverWatchButton:function(){
        this.keys.focused_part="watch_button";
        $(this.episode_doms).removeClass('active');
        $('#episode-page-back-button').removeClass('active');
        $('#episode-watch-btn').addClass('active');
    },
    hoverMovie:function(index){
        var keys=this.keys;
        keys.focused_part="grid_part";
        keys.index=index;
        $('#episode-page-back-button').removeClass('active');
        $('#episode-watch-btn').removeClass('active');
        $(this.episode_doms).removeClass('active');
        $(this.episode_doms[index]).addClass('active');
        moveScrollPosition($('#episode-grid-container'),this.episode_doms[index],'vertical',false);
        this.updateDetailPane(index);
    },
    showMovie:function(index){
        this.Exit();
        var episode_cards=$('.episode-rail-card');
        this.keys.focused_part="grid_part";
        this.keys.index=index;
        $('.episode-rail-card').removeClass('active');
        $('#episode-page-back-button').removeClass('active');
        $(episode_cards[index]).addClass('active');
        var episodes=current_season.episodes;
        current_episode=episodes[index];
        vod_series_player.makeEpisodeDoms('episode-page');
        vod_series_player.init(current_episode,'series','episode-page');
        vod_series_player.keys.episode_selection=index;
    },
    moveKey:function(increment){
        var keys=this.keys;
        var episode_cards=$('.episode-rail-card');
        if(keys.focused_part==="back_button"){
            if(increment > 0){
                this.hoverMovie(0);
            }
        }
        else if(keys.focused_part==="watch_button"){
            if(increment > 0){
                this.hoverMovie(keys.index);
            }
            else if(increment < 0){
                this.hoverGoBack();
            }
        }
        else{
            keys.index += increment;
            if(keys.index < 0){
                keys.index = 0;
                this.hoverWatchButton();
            }
            else if(keys.index >= episode_cards.length){
                keys.index = episode_cards.length - 1;
            }
            else{
                this.hoverMovie(keys.index);
            }
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        if(keys.focused_part==="back_button"){
            this.goBack();
        }
        else if(keys.focused_part==="watch_button"){
            this.showMovie(keys.index);
        }
        else{
            this.showMovie(keys.index);
        }
    },
    goBack:function(){
        this.keys.focused_part="grid_part";
        this.keys.index=0;
        $('.episode-rail-card').removeClass('active');
        $('#episode-page-back-button').removeClass('active');
        $('#episode-watch-btn').removeClass('active');
        current_route="seasons-page";
        $('#episode-page').hide();
        $('#seasons-page').show();
    },
    HandleKey:function(e){
        switch(e.keyCode){
            case tvKey.LEFT:
                if(this.keys.focused_part === "grid_part"){
                    this.hoverWatchButton();
                }
                break;
            case tvKey.RIGHT:
                if(this.keys.focused_part === "watch_button" || this.keys.focused_part === "back_button"){
                    this.hoverMovie(this.keys.index);
                }
                break;
            case tvKey.UP:
                this.moveKey(-1);
                break;
            case tvKey.DOWN:
                this.moveKey(1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
        }
    }
}

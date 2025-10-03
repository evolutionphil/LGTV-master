"use strict";
var seasons_variable={
    keys:{
        focused_part:'grid_part', // grid_part
        index:1
    },
    season_doms:[],
    is_loading:false,
    init:function(){
        showLoader(true);
        this.is_loading=true;
        var that=this;
        $('#series-title').text(current_series.num+"."+current_series.name);
        $('#series-image').attr('src', current_series.cover)
        $('#season-rating').text(current_series.rating_5based);
        $('#season-grid-container').html('');
        current_route="seasons-page";
        $('#series-summary-page').hide();
        $('#seasons-page').show();
        $('#season-grid-container').scrollTop(0);
        $($('.season-grid-item-wrapper')[0]).addClass('active');
        if(checkForAdult(current_series,'movie',SeriesModel.categories))
            SeriesModel.addRecentOrFavouriteMovie(current_series,'recent')
        if(settings.playlist_type==='xtreme'){
            $.getJSON(api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_series_info&series_id='+current_series.series_id)
                .then(
                    function(response){
                        showLoader(false);
                        that.is_loading=false;
                        current_series.info=response.info;
                        var seasons=response.seasons;
                        if((seasons && seasons.length>0) || Object.keys(response.episodes).length>0){
                            var episodes=response.episodes;
                            if(!seasons || (seasons && seasons.length==0)){
                                seasons=[];
                                Object.keys(episodes).map(function(key, index){
                                    seasons.push({
                                        name:"Season "+(index+1),
                                        cover:"images/series.png",
                                        episodes:episodes[key]
                                    })
                                })
                            }
                            else{
                                seasons.map(function(item){
                                    item.episodes=episodes[item.season_number.toString()]
                                })
                            }
                            var seasons1=seasons.filter(function (item) {
                                return item.episodes && item.episodes.length>0;
                            });
                            var episode_keys=Object.keys(episodes);
                            if(episode_keys.length>seasons1.length){
                                for(var i=0;i<seasons1.length;i++)
                                    seasons1[i].name='Season '+(i+1);
                                for(var i=seasons1.length;i<episode_keys.length;i++){
                                    seasons1.push({
                                        name:'Season '+(i+1),
                                        episodes: episodes[(i+1).toString()]
                                    })
                                }
                            }
                            current_series.seasons=seasons1;
                            that.renderSeasons();
                            that.hoverSeasonItem(0);
                        }else{
                            showToast("Sorry","No seasons available");
                            that.goBack()
                        }
                    }
                ).fail(function () {
                    showToast("Sorry","something is wrong. Please try again later.");
                    showLoader(false);
                    that.goBack();
                });
        }
        else if(settings.playlist_type==="type1"){
            showLoader(false);
            this.is_loading=false;
            current_series.seasons.map(function(item){
                item.episodes=current_series.episodes[item.name]
            })
            this.renderSeasons();
            $($('.season-grid-item-wrapper')[0]).addClass('active');
            this.hoverSeasonItem(0);
        }
    },
    renderSeasons:function(){
        var htmlContent="";
        current_series.seasons.map(function(season, index1){
            htmlContent+=
                '<div class="season-grid-item-container">\
                    <div class="season-grid-item-wrapper"\
                        data-index="'+index1+'"\
                        onclick="seasons_variable.showEpisode('+index1+')"\
                        onmouseenter="seasons_variable.hoverSeasonItem('+index1+')"\
                    >\
                        <img class="season-image" src="'+season.cover+'" onerror="this.src=\'images/series.png\'">\
                        <div class="season-title-wrapper position-relative">\
                            <p class="season-title">'+
                                season.name+
                            '</p>\
                        </div>\
                    </div>\
                </div>'
        })
        $('#season-grid-container').html(htmlContent);
        seasons_variable.season_doms=$('.season-grid-item-wrapper');
    },
    hoverGoBack:function(){
        this.keys.focused_part="back_button";
        $(this.season_doms).removeClass('active');
        $('#season-page-back-button').addClass('active');
    },
    hoverSeasonItem:function(index){
        var keys=this.keys;
        keys.focused_part="grid_part";
        keys.index=index;
        $('#season-page-back-button').removeClass('active');
        $(this.season_doms).removeClass('active');
        $(this.season_doms[index]).addClass('active');
        moveScrollPosition($('#season-grid-container'),this.season_doms[index],'vertical',false)
    },
    showEpisode:function(index){
        var season_buttons=$('.season-grid-item-wrapper');
        this.keys.focused_part="grid_part";
        this.keys.index=index;
        $('.season-grid-item-wrapper').removeClass('active');
        $('#season-page-back-button').removeClass('active');
        $(season_buttons[index]).addClass('active');
        current_season=current_series.seasons[index];
        var episodes=current_season.episodes;
        if(typeof episodes!="undefined" && episodes.length>0){
            $('#season-title-container').text(current_season.name);
            var htmlContent="";
            episodes.map(function(episode, index){
                htmlContent+=
                    '<div class="episode-grid-item-container">\
                        <div class="episode-grid-item-wrapper" data-index="'+index+'"\
                            onclick="episode_variable.showMovie('+index+')"\
                            onmouseenter="episode_variable.hoverMovie('+index+')"\
                        >\
                            <img class="episode-image" src="'+episode.info.movie_image+'" onerror="this.src=\'images/series.png\'">\
                            <div class="episode-title-wrapper position-relative">\
                                <p class="episode-title">'+
                                    episode.title+
                                '</p>\
                            </div>\
                        </div>\
                    </div>'
            })
            $('#episode-grid-container').html(htmlContent);
            episode_variable.episode_doms=$('.episode-grid-item-wrapper');
            current_route="episode-page";
            $('#seasons-page').hide();
            $('#episode-page').show();
            $('#episode-grid-container').scrollTop(0);
            $($('.episode-grid-item-wrapper')[0]).addClass('active');
            episode_variable.keys.focused_part="grid_part";
            episode_variable.keys.grid_part=0;
        }
        else{
            showToast("Sorry","No episodes available");
        }
    },
    moveKey:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="back_button"){
            if(increment>0){
                keys.focused_part="grid_part";
                keys.index=0;
                $('#season-page-back-button').removeClass('active');
                $(this.season_doms[0]).addClass('active');
            }
        }
        else{
            var season_buttons=$('.season-grid-item-wrapper');
            keys.index+=increment;
            if(keys.index<0){
                keys.focused_part="back_button";
                $('.season-grid-item-wrapper').removeClass('active');
                $('#season-page-back-button').addClass('active');
            }
            else{
                if(keys.index>=season_buttons.length)
                    keys.index=season_buttons.length-1;
                $('.season-grid-item-wrapper').removeClass('active');
                $(season_buttons[keys.index]).addClass('active');
                moveScrollPosition($('#season-grid-container'),$(season_buttons[keys.index]).closest('.season-grid-item-container'),'vertical',false)
            }
        }
    },
    handleMenuClick:function(){
        var element;
        var keys=this.keys;
        if(keys.focused_part==="back_button")
            element=$('#season-page-back-button');
        else{

            var season_buttons=$('.season-grid-item-wrapper');
            element=season_buttons[keys.index];
        }
        $(element).trigger('click');
    },
    goBack:function(){
        this.keys.focused_part="grid_part";
        this.keys.index=0;
        $('.season-grid-item-wrapper').removeClass('active');
        $('#season-page-back-button').removeClass('active');
        current_route="series-summary-page";
        $('#seasons-page').hide();
        $('#series-summary-page').show();
    },
    HandleKey:function(e){
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                this.goBack();
                showLoader(false);
                this.is_loading=false;
            }
            return;
        }
        switch(e.keyCode){
            case tvKey.LEFT:
                this.moveKey(-1);
                break;
            case tvKey.RIGHT:
                this.moveKey(1);
                break;
            case tvKey.UP:
                this.moveKey(-5);
                break;
            case tvKey.DOWN:
                this.moveKey(5);
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

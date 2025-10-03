"use strict";
var series_summary_page={
    keys:{
        index:1,
        buttons:[]
    },
    min_btn_index:0,
    is_loading:false,
    prev_route:'',
    buttons:$('.series-action-btn'),
    init:function(prev_route){
        this.prev_route=prev_route;
        showLoader(true);
        this.is_loading=true;
        $('#series-summary-image-wrapper img').attr('src','');
        $('.vod-series-background-img').attr('src','');
        $('#series-summary-name').text(current_series.name);
        $('#series-summary-release-date').text(current_series.releasedate);
        $('#series-summary-release-genre').text(current_series.genre);
        $('#series-summary-release-length').text(current_series.duration);
        $('#series-summary-release-country').text(current_series.country);
        $('#series-summary-release-director').text(current_series.director);
        $('#series-summary-release-cast').text(current_series.cast);
        $('#series-summary-description').text(current_series.plot);
        $('#series-summary-image-wrapper img').attr('src',current_series.cover)
        var backdrop_image='';
        try{
            backdrop_image=current_series.backdrop_path[0];
        }catch (e) {
        }
        
        // Use backdrop if available, otherwise use poster as fallback
        if(backdrop_image) {
            $('.vod-series-background-img').attr('src',backdrop_image);
        } else if(current_series.cover) {
            $('.vod-series-background-img').attr('src',current_series.cover);
        }
        this.hoverButtons(1);
        if(current_series.is_favourite){
            $(this.buttons[2]).data('action','remove')
            $(this.buttons[2]).find('.vod-series-action-btn-txt').text('Remove Favourite')
        }
        else{
            $(this.buttons[2]).data('action','add')
            $(this.buttons[2]).find('.vod-series-action-btn-txt').text('Add Favourite')
        }
        var rating=0;
        if(typeof current_series.rating==="undefined" || current_series.rating==="")
            rating=0;
        else
            rating=parseFloat(current_series.rating);
        if(isNaN(rating))
            rating=0;
        $('#series-rating-container').find('.rating-upper').css({width:rating*10+"%"});
        $('#series-rating-mark').text(rating.toFixed(1));
        if(typeof current_series.youtube_trailer!='undefined' && current_series.youtube_trailer!=null && current_series.youtube_trailer.trim()!==''){
            this.min_btn_index=0;
            $('#series-watch-trailer-button').show();
        }else{
            this.min_btn_index=1;
            $('#series-watch-trailer-button').hide();
        }
        $('#current-series-category').text('');
        var categories=SeriesModel.categories;
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==current_series.category_id){
                $('#current-series-category').text(categories[i].category_name);
                break;
            }
        }

        showLoader(false);
        this.is_loading=false;
        current_route="series-summary-page";
        $('#series-summary-page').show();
    },
    goBack:function(){
        current_route=this.prev_route;
        $('#series-summary-page').hide();
        switch (this.prev_route) {
            case "home-page":
                // Check if we need to refresh favorites category after removal
                if(typeof current_category !== 'undefined' && current_category.category_id === 'favourite') {
                    // Refresh the favorites category to fill empty spaces
                    home_page.reEnter();
                    setTimeout(function() {
                        home_page.showCategoryContent();
                    }, 100);
                } else {
                    home_page.reEnter();
                }
                break;
            case "search-page":
                $('#search-page').show();
                break;
        }
    },
    hoverButtons:function(index){
        $(this.buttons).removeClass('active');
        this.keys.index=index;
        $(this.buttons[index]).addClass('active');
    },
    keyMove:function(increment){
        var keys=this.keys;
        keys.index+=increment;
        var min_btn_index=this.min_btn_index;
        if(keys.index<min_btn_index)
            keys.index=2;
        if(keys.index>2)
            keys.index=min_btn_index;
        $('.series-action-btn').removeClass('active');
        $($('.series-action-btn')[keys.index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        var buttons=$('.series-action-btn');
        var current_button=buttons[keys.index];
        $(current_button).trigger('click');
    },
    showTrailerVideo:function(){
        trailer_page.back_url="series-summary-page";
        if(!current_series.youtube_trailer){
            showToast("Sorry",'No trailer video available')
        }else
            trailer_page.init(current_series.youtube_trailer,'series-summary-page');
    },
    showSeason:function(){
        seasons_variable.init();
    },
    addFavorite:function(targetElement){
        var action=$(targetElement).data('action');
        if(action==="add"){
            SeriesModel.addRecentOrFavouriteMovie(current_series,'favourite');
            current_series.is_favourite=true;
            // End
            $(targetElement).data('action','remove');
            $(targetElement).find('.vod-series-action-btn-txt').text('Remove Favourite');
        }
        else{
            current_series.is_favourite=false;
            SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,'favourite')
            $(targetElement).data('action','add');
            $(targetElement).find('.vod-series-action-btn-txt').text('Add Favourite');
        }
    },
    HandleKey:function (e) {
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                showLoader(false);
                this.is_loading=false;
                this.goBack();
            }
            return;
        }
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.LEFT:
                this.keyMove(-1);
                break;
            case tvKey.RIGHT:
                this.keyMove(1);
                break;
            case tvKey.YELLOW:
                if(!current_series.is_favourite){
                    SeriesModel.addRecentOrFavouriteMovie(current_series, 'favourite');
                    current_series.is_favourite=true;
                }
                else{
                    SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,"favourite");
                    current_series.is_favourite=false;
                }
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
        }
    }
}

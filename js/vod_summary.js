"use strict";
var vod_summary_page={
    keys:{
        index:0,
    },
    buttons:$('.vod-action-btn'),
    min_btn_index:0,
    is_loading:false,
    prev_route:'',
    init:function(prev_route){
        this.prev_route=prev_route;
        this.min_btn_index=0;
        var that=this;
        $('#vod-summary-image-wrapper img').attr('src','');
        $('#vod-summary-name').text(current_movie.name);
        $('#vod-watch-trailer-button').hide();
        $('#vod-summary-release-date').text("");
        $('#vod-summary-release-genre').text("");
        $('#vod-summary-release-length').text("");
        $('#vod-summary-release-country').text("");
        $('.vod-series-background-img').attr('src','').hide();
        $('#vod-summary-release-director').text("");
        $('#vod-summary-release-cast').text("");
        $('#vod-summary-image-wrapper img').attr('src',current_movie.stream_icon);
        $('#vod-summary-description').text("");
        that.hoverButtons(1);
        if(current_movie.is_favourite){
            $(this.buttons[2]).data('action','remove')
            $(this.buttons[2]).find('.vod-series-action-btn-txt').text('Remove Favourite')
        }
        else{
            $(this.buttons[2]).data('action','add')
            $(this.buttons[2]).find('.vod-series-action-btn-txt').text('Add Favourite')
        }
        var rating=0;
        if(typeof current_movie.rating==="undefined" || current_movie.rating==="")
            rating=0;
        else
            rating=parseFloat(current_movie.rating);
        if(isNaN(rating))
            rating=0;
        $('#vod-rating-container').find('.rating-upper').css({width:rating*10+"%"});
        $('#vod-rating-mark').text(rating.toFixed(1));
        current_movie.youtube_trailer="";
        current_route="vod-summary-page";

        $('#current-vod-category').text('');
        var categories=VodModel.categories;
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==current_movie.category_id){
                $('#current-vod-category').text(categories[i].category_name);
                break;
            }
        }

        home_page.Exit();
        $('#vod-summary-page').show();
        if(settings.playlist_type==="xtreme"){
            showLoader(true);
            this.is_loading=true;
            $.getJSON(api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_vod_info&vod_id='+current_movie.stream_id)
                .then(
                    function(response){
                        console.log('=== XTREME API get_vod_info RESPONSE ANALYSIS ===');
                        console.log('Full API response:', response);
                        console.log('Info object:', response.info);
                        console.log('TMDB ID check:', response.info.tmdb_id);
                        
                        showLoader(false);
                        that.is_loading=false;
                        var info=response.info;
                        
                        // Store complete info object
                        current_movie.info = info;
                        
                        // CRITICAL: Extract TMDB ID from API response
                        if(info.tmdb_id) {
                            current_movie.tmdb_id = info.tmdb_id;
                            console.log('✅ TMDB ID extracted and stored:', current_movie.tmdb_id);
                        } else {
                            console.log('⚠️ NO TMDB ID in API response - subtitle matching will be less accurate');
                        }
                        
                        // Store other enhanced metadata for subtitle fetching
                        if(info.year) {
                            current_movie.year = info.year;
                        }
                        if(info.releasedate) {
                            current_movie.release_date = info.releasedate;
                        }
                        
                        // Update UI elements
                        $('#vod-summary-release-date').text(info.releasedate);
                        $('#vod-summary-release-genre').text(info.genre);
                        $('#vod-summary-release-length').text(info.duration);
                        $('#vod-summary-release-country').text(info.country ? info.country : '');
                        $('#vod-summary-release-director').text(info.director);
                        $('#vod-summary-release-cast').text(info.cast);
                        $('#vod-summary-description').text(info.description);

                        var backdrop_image='';
                        try{
                            backdrop_image=info.backdrop_path[0];
                        }catch (e) {
                        }
                        
                        // Use backdrop if available, otherwise use poster as fallback
                        if(backdrop_image) {
                            $('.vod-series-background-img').attr('src', backdrop_image).show().on('error', function() {
                                $(this).hide();
                            });
                        } else if(current_movie.stream_icon) {
                            $('.vod-series-background-img').attr('src', current_movie.stream_icon).show().on('error', function() {
                                $(this).hide();
                            });
                        } else {
                            $('.vod-series-background-img').hide();
                        }

                        if(typeof info.youtube_trailer!='undefined' && info.youtube_trailer!=null && info.youtube_trailer.trim()!==''){
                            that.min_btn_index=0;
                            $('#vod-watch-trailer-button').show();
                        }else{
                            that.min_btn_index=1;
                            $('#vod-watch-trailer-button').hide();
                        }
                        current_movie.youtube_trailer=response.info.youtube_trailer;
                        
                        console.log('=== MOVIE DATA STORAGE COMPLETE ===');
                        console.log('Current movie enhanced data - Name:', current_movie.name, 'TMDB:', current_movie.tmdb_id, 'Year:', current_movie.year);
                    }
                )
                .fail(
                    function () {
                        showLoader(false);
                        that.is_loading=false;
                    }
                )
        }
    },
    goBack:function(){
        $('#vod-summary-page').hide();
        switch (this.prev_route) {
            case 'home-page':
                home_page.reEnter();
                // Check if favorites need refresh
                if(favourites_dirty) {
                    favourites_dirty = false;
                    // Update the favorites count in submenu
                    if(typeof home_page.updateRecentFavouriteMoviesCount === 'function') {
                        home_page.updateRecentFavouriteMoviesCount();
                    }
                    // If currently viewing favorites category, refresh the grid
                    if(typeof current_category !== 'undefined' && current_category.category_id === 'favourite') {
                        // Find the favorite category directly from the model's categories array
                        var categories = VodModel.categories;
                        for(var i = 0; i < categories.length; i++) {
                            if(categories[i].category_id === 'favourite') {
                                current_category = categories[i];
                                break;
                            }
                        }
                        // Rebuild the grid with updated favorites
                        setTimeout(function() {
                            home_page.showCategoryContent();
                        }, 100);
                    }
                }
                break;
            case 'search-page':
                $('#search-page').show();
                break;
        }
        current_route=this.prev_route;
    },
    Exit:function(){
        $('#vod-summary-page').hide();
    },
    showTrailerVideo:function(){
        if(!current_movie.youtube_trailer){
            showToast("Sorry","No trailer video available")
        }
        else
            trailer_page.init(current_movie.youtube_trailer,'vod-summary-page');
    },
    showMovie:function(){
        $('#vod-summary-page').hide();
        vod_series_player.makeEpisodeDoms('home-page');
        vod_series_player.init(current_movie,"movies",this.prev_route);
    },
    addFavorite:function(targetElement){
        var action=$(targetElement).data('action');
        if(action==="add"){
            current_movie.is_favourite=true;
            VodModel.addRecentOrFavouriteMovie(current_movie,'favourite');
            $(targetElement).data('action','remove');
            $(targetElement).find('.vod-series-action-btn-txt').text('Remove Favourite');
        }
        else{
            current_movie.is_favourite=false;
            VodModel.removeRecentOrFavouriteMovie(current_movie.stream_id,'favourite');
            $(targetElement).data('action','add');
            $(targetElement).find('.vod-series-action-btn-txt').text('Add Favourite');
        }
        favourites_dirty = true;
    },
    hoverButtons:function(index){
        $(this.buttons).removeClass('active');
        this.keys.index=index;
        $(this.buttons[index]).addClass('active');
    },
    keyMove:function(increment){
        var min_index=this.min_btn_index;
        var keys=this.keys;
        keys.index+=increment;
        if(keys.index<min_index)
            keys.index=2;
        if(keys.index>2)
            keys.index=min_index;
        $(this.buttons).removeClass('active');
        $(this.buttons[keys.index]).addClass('active');
    },
    handleMenuClick:function(){
        $(this.buttons[this.keys.index]).trigger('click');
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
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.YELLOW:
                if(!current_movie.is_favourite){
                    VodModel.addRecentOrFavouriteMovie(current_movie, 'favourite');
                    current_movie.is_favourite=true;
                }
                else{
                    VodModel.removeRecentOrFavouriteMovie(current_movie.stream_id,"favourite");
                    current_movie.is_favourite=false;
                }
                favourites_dirty = true;
                break;
            case tvKey.BLUE:
                this.Exit();
                goHomePageWithMovieType('series');
                break;
        }
    }
}

"use strict";
var TMDB_API_KEY = 'b5ab31cb478049712548766da824a625';
var TMDB_BASE_URL = 'https://api.themoviedb.org/3';

var vod_summary_page={
    keys:{
        index:0,
        section: 'buttons',
        similar_index: 0
    },
    buttons:null,
    min_btn_index:0,
    is_loading:false,
    prev_route:'',
    similar_movies: [],
    init:function(prev_route){
        this.prev_route=prev_route;
        this.min_btn_index=0;
        this.keys.section = 'buttons';
        this.keys.index = 1;
        this.keys.similar_index = 0;
        this.similar_movies = [];
        this.buttons = $('.vod-action-btn-new');
        $('#similar-movies-section').hide();
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
            $(this.buttons[2]).data('action','remove');
            $(this.buttons[2]).find('span[data-word_code]').text('Remove');
        }
        else{
            $(this.buttons[2]).data('action','add');
            $(this.buttons[2]).find('span[data-word_code]').text('Favorite');
        }
        var rating=0;
        if(typeof current_movie.rating==="undefined" || current_movie.rating==="")
            rating=0;
        else
            rating=parseFloat(current_movie.rating);
        if(isNaN(rating))
            rating=0;
        $('#vod-rating-mark').text(rating.toFixed(1));
        if(rating > 0) {
            $('#vod-rating-container').show();
        } else {
            $('#vod-rating-container').hide();
        }
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
        
        setTimeout(function() {
            that.loadSimilarMoviesLazy(current_movie.stream_id);
        }, 100);
        
        if(settings.playlist_type==="xtreme"){
            $('#vod-summary-release-length').hide();
            $.getJSON(api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_vod_info&vod_id='+current_movie.stream_id)
                .then(
                    function(response){
                        console.log('=== XTREME API get_vod_info RESPONSE ANALYSIS ===');
                        console.log('Full API response:', response);
                        console.log('Info object:', response.info);
                        console.log('TMDB ID check:', response.info.tmdb_id);
                        
                        var info=response.info;
                        
                        current_movie.info = info;
                        
                        if(info.tmdb_id) {
                            current_movie.tmdb_id = info.tmdb_id;
                            console.log('✅ TMDB ID extracted and stored:', current_movie.tmdb_id);
                        } else {
                            console.log('⚠️ NO TMDB ID in API response');
                        }
                        
                        if(info.year) {
                            current_movie.year = info.year;
                        }
                        if(info.releasedate) {
                            current_movie.release_date = info.releasedate;
                        }
                        
                        $('#vod-summary-release-date').text(info.releasedate);
                        $('#vod-summary-release-genre').text(info.genre);
                        
                        if(info.duration && info.duration !== '' && info.duration !== '0') {
                            $('#vod-summary-release-length').text(info.duration).show();
                        } else {
                            $('#vod-summary-release-length').text('').hide();
                        }
                        
                        if(info.country && info.country.trim() !== '') {
                            $('#vod-summary-release-country').text(info.country).closest('.vod-detail-item').show();
                        } else {
                            $('#vod-summary-release-country').closest('.vod-detail-item').hide();
                        }
                        
                        if(info.director && info.director.trim() !== '') {
                            $('#vod-summary-release-director').text(info.director).closest('.vod-detail-item').show();
                        } else {
                            $('#vod-summary-release-director').closest('.vod-detail-item').hide();
                        }
                        
                        if(info.cast && info.cast.trim() !== '') {
                            $('#vod-summary-release-cast').text(info.cast).closest('.vod-detail-item').show();
                        } else {
                            $('#vod-summary-release-cast').closest('.vod-detail-item').hide();
                        }
                        
                        if(info.description && info.description.trim() !== '') {
                            $('#vod-summary-description').text(info.description).show();
                        } else {
                            $('#vod-summary-description').hide();
                        }

                        var backdrop_image='';
                        try{
                            backdrop_image=info.backdrop_path[0];
                        }catch (e) {
                        }
                        
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
                        console.log('get_vod_info API failed');
                    }
                )
        } else {
            if(current_movie.duration && current_movie.duration !== '' && current_movie.duration !== '0') {
                $('#vod-summary-release-length').text(current_movie.duration).show();
            } else {
                $('#vod-summary-release-length').text('').hide();
            }
        }
    },
    loadSimilarMoviesLazy: function(currentMovieId) {
        var that = this;
        console.log('=== LAZY LOADING SIMILAR MOVIES ===');
        this.findSameCategoryMovies(currentMovieId);
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
            $(targetElement).find('span[data-word_code]').text('Remove');
        }
        else{
            current_movie.is_favourite=false;
            VodModel.removeRecentOrFavouriteMovie(current_movie.stream_id,'favourite');
            $(targetElement).data('action','add');
            $(targetElement).find('span[data-word_code]').text('Favorite');
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
        switch (e.keyCode) {
            case tvKey.RETURN:
                if(this.is_loading){
                    showLoader(false);
                    this.is_loading=false;
                }
                this.goBack();
                break;
            case tvKey.LEFT:
                if (this.keys.section === 'similar') {
                    this.handleSimilarKeyMove(-1);
                } else {
                    this.keyMove(-1);
                }
                break;
            case tvKey.RIGHT:
                if (this.keys.section === 'similar') {
                    this.handleSimilarKeyMove(1);
                } else {
                    this.keyMove(1);
                }
                break;
            case tvKey.ENTER:
                if (this.keys.section === 'similar') {
                    this.selectSimilarMovie(this.keys.similar_index);
                } else {
                    this.handleMenuClick();
                }
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
            case tvKey.DOWN:
                if (this.keys.section === 'buttons' && this.similar_movies.length > 0) {
                    this.keys.section = 'similar';
                    $(this.buttons).removeClass('active');
                    this.hoverSimilarMovie(this.keys.similar_index);
                }
                break;
            case tvKey.UP:
                if (this.keys.section === 'similar') {
                    this.keys.section = 'buttons';
                    $('.similar-movie-item').removeClass('active');
                    this.hoverButtons(this.keys.index);
                }
                break;
        }
    },
    parseGenres: function(genreString) {
        if (!genreString || genreString === '') {
            return [];
        }
        var genres = genreString.split(/[,\/]/);
        var result = [];
        for (var i = 0; i < genres.length; i++) {
            var genre = genres[i].trim().toLowerCase();
            if (genre !== '') {
                result.push(genre);
            }
        }
        return result;
    },
    findSimilarMovies: function(currentGenre, currentMovieId) {
        var that = this;
        var tmdbId = current_movie.tmdb_id;
        
        console.log('=== SIMILAR MOVIES DEBUG ===');
        console.log('Current movie TMDB ID:', tmdbId);
        console.log('Current movie genre string:', currentGenre);
        
        if (tmdbId) {
            console.log('Fetching similar movies from TMDB API...');
            this.fetchTMDBSimilarMovies(tmdbId, currentMovieId, currentGenre);
        } else {
            console.log('No TMDB ID, falling back to category matching');
            this.findSameCategoryMovies(currentMovieId);
        }
    },
    fetchTMDBSimilarMovies: function(tmdbId, currentMovieId, fallbackGenre) {
        var that = this;
        var url = TMDB_BASE_URL + '/movie/' + tmdbId + '/similar?api_key=' + TMDB_API_KEY + '&language=en-US&page=1';
        
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            timeout: 10000,
            success: function(response) {
                console.log('TMDB Similar Movies API Response:', response);
                
                if (response.results && response.results.length > 0) {
                    var tmdbMovies = [];
                    for (var i = 0; i < response.results.length; i++) {
                        var m = response.results[i];
                        tmdbMovies.push({
                            id: m.id,
                            title: m.title || '',
                            original_title: m.original_title || '',
                            release_year: m.release_date ? m.release_date.substring(0, 4) : ''
                        });
                    }
                    console.log('TMDB similar movies:', tmdbMovies);
                    
                    that.matchTMDBWithLibrary(tmdbMovies, currentMovieId, fallbackGenre);
                } else {
                    console.log('No similar movies from TMDB, using category fallback');
                    that.findSameCategoryMovies(currentMovieId);
                }
            },
            error: function(xhr, status, error) {
                console.log('TMDB API error:', error, '- using category fallback');
                that.findSameCategoryMovies(currentMovieId);
            }
        });
    },
    normalizeTitle: function(title) {
        if (!title) return '';
        return title.toLowerCase()
            .replace(/[:\-–—]/g, ' ')
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },
    getSeriesBaseName: function(movieName) {
        if (!movieName) return '';
        var name = movieName
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\s*[:\-–—]\s*(part|teil|chapter|episode)?\s*\d+.*$/i, '')
            .replace(/\s*\d+\s*$/g, '')
            .replace(/\s*(I{1,3}|IV|V|VI{0,3}|IX|X)\s*$/i, '')
            .trim();
        return name.length >= 3 ? name.toLowerCase() : '';
    },
    findSameSeriesMovies: function(currentMovieId) {
        var that = this;
        var currentName = current_movie.name || '';
        var currentCategoryId = current_movie.category_id;
        var seriesBase = this.getSeriesBaseName(currentName);
        
        console.log('=== SAME SERIES SEARCH ===');
        console.log('Current movie:', currentName);
        console.log('Current category:', currentCategoryId);
        console.log('Series base name:', seriesBase);
        
        if (seriesBase.length < 5) {
            return [];
        }
        
        var allMovies = VodModel.movies || [];
        if (allMovies.length === 0) {
            var categories = VodModel.categories || [];
            for (var c = 0; c < categories.length; c++) {
                var cat = categories[c];
                if (cat.movies && cat.movies.length > 0) {
                    for (var m = 0; m < cat.movies.length; m++) {
                        allMovies.push(cat.movies[m]);
                    }
                }
            }
        }
        
        var seriesMovies = [];
        for (var i = 0; i < allMovies.length; i++) {
            var movie = allMovies[i];
            if (movie.stream_id === currentMovieId) continue;
            if (movie.category_id !== currentCategoryId) continue;
            
            var movieName = movie.name || '';
            var movieBase = this.getSeriesBaseName(movieName);
            
            if (movieBase.length >= 5 && seriesBase.length >= 5 &&
                (movieBase === seriesBase || 
                 (movieName.toLowerCase().indexOf(seriesBase) === 0 && seriesBase.length >= 8))) {
                seriesMovies.push(movie);
                console.log('✅ SERIES MATCH (same category): "' + movieName + '"');
            }
        }
        
        console.log('Same series movies found:', seriesMovies.length);
        return seriesMovies;
    },
    matchTMDBWithLibrary: function(tmdbMovies, currentMovieId, fallbackGenre) {
        var that = this;
        var allMovies = VodModel.movies || [];
        
        if (allMovies.length === 0) {
            var categories = VodModel.categories || [];
            for (var c = 0; c < categories.length; c++) {
                var cat = categories[c];
                if (cat.movies && cat.movies.length > 0) {
                    for (var m = 0; m < cat.movies.length; m++) {
                        allMovies.push(cat.movies[m]);
                    }
                }
            }
        }
        
        var seriesMovies = this.findSameSeriesMovies(currentMovieId);
        
        var existingIds = {};
        for (var s = 0; s < seriesMovies.length; s++) {
            existingIds[seriesMovies[s].stream_id] = true;
        }
        
        console.log('Matching TMDB movies by NAME with library of', allMovies.length, 'movies');
        
        var matched = [];
        
        for (var t = 0; t < tmdbMovies.length; t++) {
            var tmdbMovie = tmdbMovies[t];
            var tmdbTitle = this.normalizeTitle(tmdbMovie.title);
            var tmdbOriginal = this.normalizeTitle(tmdbMovie.original_title);
            var tmdbYear = tmdbMovie.release_year;
            
            if (tmdbTitle.length < 3 && tmdbOriginal.length < 3) {
                continue;
            }
            
            for (var i = 0; i < allMovies.length; i++) {
                var movie = allMovies[i];
                if (movie.stream_id === currentMovieId) continue;
                if (existingIds[movie.stream_id]) continue;
                
                var alreadyMatched = false;
                for (var m = 0; m < matched.length; m++) {
                    if (matched[m].movie.stream_id === movie.stream_id) {
                        alreadyMatched = true;
                        break;
                    }
                }
                if (alreadyMatched) continue;
                
                var movieName = movie.name || '';
                var normalizedName = this.normalizeTitle(movieName);
                
                if (normalizedName.length < 3) continue;
                
                var yearMatch = true;
                if (tmdbYear && movieName.indexOf(tmdbYear) === -1) {
                    var movieYear = movieName.match(/\((\d{4})\)/);
                    if (movieYear && movieYear[1] !== tmdbYear) {
                        yearMatch = false;
                    }
                }
                
                if (yearMatch) {
                    var titleMatch = false;
                    if (tmdbTitle.length >= 3 && normalizedName.length >= 3) {
                        if (normalizedName === tmdbTitle || 
                            (normalizedName.length >= 5 && tmdbTitle.length >= 5 && 
                             (normalizedName.indexOf(tmdbTitle) !== -1 || tmdbTitle.indexOf(normalizedName) !== -1))) {
                            titleMatch = true;
                        }
                    }
                    if (!titleMatch && tmdbOriginal && tmdbOriginal.length >= 3 && normalizedName.length >= 3) {
                        if (normalizedName === tmdbOriginal ||
                            (normalizedName.length >= 5 && tmdbOriginal.length >= 5 &&
                             (normalizedName.indexOf(tmdbOriginal) !== -1 || tmdbOriginal.indexOf(normalizedName) !== -1))) {
                            titleMatch = true;
                        }
                    }
                    
                    if (titleMatch) {
                        matched.push({
                            movie: movie,
                            order: t,
                            matchedWith: tmdbMovie.title
                        });
                        existingIds[movie.stream_id] = true;
                        console.log('✅ NAME MATCH: "' + movieName + '" ↔ "' + tmdbMovie.title + '"');
                        break;
                    }
                }
            }
        }
        
        matched.sort(function(a, b) {
            return a.order - b.order;
        });
        
        console.log('TMDB name matches in library:', matched.length);
        
        var allMatched = seriesMovies.slice(0, 5);
        for (var m = 0; m < matched.length && allMatched.length < 15; m++) {
            allMatched.push(matched[m].movie);
        }
        
        console.log('Total matches (series + TMDB):', allMatched.length);
        
        if (allMatched.length >= 3) {
            this.similar_movies = allMatched;
            if (allMatched.length < 15) {
                this.addCategoryFallback(this.similar_movies, currentMovieId);
                return;
            }
            this.renderSimilarMovies();
        } else {
            console.log('Not enough matches, adding category movies');
            this.addCategoryFallback(allMatched, currentMovieId);
        }
    },
    addCategoryFallback: function(existingMatches, currentMovieId) {
        var allMovies = VodModel.movies || [];
        if (allMovies.length === 0) {
            var categories = VodModel.categories || [];
            for (var c = 0; c < categories.length; c++) {
                var cat = categories[c];
                if (cat.movies && cat.movies.length > 0) {
                    for (var m = 0; m < cat.movies.length; m++) {
                        allMovies.push(cat.movies[m]);
                    }
                }
            }
        }
        
        var existingIds = {};
        for (var e = 0; e < existingMatches.length; e++) {
            existingIds[existingMatches[e].stream_id] = true;
        }
        
        var categoryMovies = [];
        for (var i = 0; i < allMovies.length; i++) {
            var movie = allMovies[i];
            if (movie.stream_id === currentMovieId) continue;
            if (existingIds[movie.stream_id]) continue;
            if (movie.category_id === current_movie.category_id) {
                categoryMovies.push(movie);
            }
        }
        
        for (var j = categoryMovies.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var temp = categoryMovies[j];
            categoryMovies[j] = categoryMovies[k];
            categoryMovies[k] = temp;
        }
        
        this.similar_movies = existingMatches.concat(categoryMovies.slice(0, 15 - existingMatches.length));
        console.log('Final similar movies (TMDB + category):', this.similar_movies.length);
        this.renderSimilarMovies();
    },
    removeTurkishDiacritics: function(str) {
        if (!str) return '';
        return str
            .replace(/\u0307/g, '')
            .replace(/ü/g, 'u').replace(/Ü/g, 'U')
            .replace(/ö/g, 'o').replace(/Ö/g, 'O')
            .replace(/ı/g, 'i').replace(/İ/g, 'I')
            .replace(/ş/g, 's').replace(/Ş/g, 'S')
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
            .replace(/ç/g, 'c').replace(/Ç/g, 'C')
            .replace(/â/g, 'a').replace(/Â/g, 'A')
            .replace(/î/g, 'i').replace(/Î/g, 'I')
            .replace(/û/g, 'u').replace(/Û/g, 'U');
    },
    normalizeSeriesName: function(title) {
        if (!title) return '';
        var step1 = this.removeTurkishDiacritics(title.toLowerCase());
        var normalized = step1
            .replace(/\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4}/g, '')
            .replace(/\d{1,2}\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik|january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,4}/gi, '')
            .replace(/\d+\.\s*(bolum|episode|ep)\b/gi, '')
            .replace(/\b(bolum|episode|ep)\s*\d+/gi, '')
            .replace(/[\(\)\[\],'"]+/g, ' ')
            .replace(/\s*\d+\s*$/g, '')
            .replace(/\s*[\.\-]\s*$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return normalized;
    },
    extractMovieSeriesBase: function(title) {
        if (!title) return '';
        var step1 = this.removeTurkishDiacritics(title.toLowerCase());
        var base = step1
            .replace(/\s*\([^)]*\)\s*/g, '')
            .replace(/\s*\[[^\]]*\]\s*/g, '');
        var colonIndex = base.indexOf(':');
        if (colonIndex > 3) {
            base = base.substring(0, colonIndex);
        }
        var dashMatch = base.match(/^(.{4,}?)\s+[\-–—]\s+/);
        if (dashMatch) {
            base = dashMatch[1];
        }
        base = base
            .replace(/\s*(I{1,3}|IV|V|VI{0,3}|IX|X{1,3})\s*$/i, '')
            .replace(/\s*\d+\s*$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return base;
    },
    parseEpisodeNumber: function(title) {
        if (!title) return -1;
        if (/\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4}/.test(title)) {
            return -1;
        }
        if (/\d{1,2}\s+(ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık)/i.test(title)) {
            return -1;
        }
        var patterns = [
            /(\d+)\.\s*(bölüm|bolum|episode|ep)/i,
            /(bölüm|bolum|episode|ep)\s*(\d+)/i
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = title.match(patterns[i]);
            if (match) {
                var num = parseInt(match[1]) || parseInt(match[2]);
                if (!isNaN(num) && num > 0 && num < 10000) {
                    return num;
                }
            }
        }
        return -1;
    },
    findSameCategoryMovies: function(currentMovieId) {
        var that = this;
        var allMovies = VodModel.movies || [];
        if (allMovies.length === 0) {
            var categories = VodModel.categories || [];
            for (var c = 0; c < categories.length; c++) {
                var cat = categories[c];
                if (cat.movies && cat.movies.length > 0) {
                    for (var m = 0; m < cat.movies.length; m++) {
                        allMovies.push(cat.movies[m]);
                    }
                }
            }
        }
        
        var currentName = current_movie.name || '';
        var currentSeriesName = this.normalizeSeriesName(currentName);
        var currentMovieBase = this.extractMovieSeriesBase(currentName);
        var currentEpisode = this.parseEpisodeNumber(currentName);
        
        console.log('=== NETFLIX STYLE SIMILAR MOVIES ===');
        console.log('Current:', currentName);
        console.log('Series name:', currentSeriesName);
        console.log('Movie base:', currentMovieBase);
        console.log('Episode:', currentEpisode);
        
        var sameSeriesMovies = [];
        var otherCategoryMovies = [];
        
        for (var i = 0; i < allMovies.length; i++) {
            var movie = allMovies[i];
            if (movie.stream_id === currentMovieId) continue;
            if (movie.category_id !== current_movie.category_id) continue;
            
            var movieName = movie.name || '';
            var movieSeriesName = this.normalizeSeriesName(movieName);
            var movieBase = this.extractMovieSeriesBase(movieName);
            var movieEpisode = this.parseEpisodeNumber(movieName);
            
            var isMatch = false;
            
            if (currentSeriesName.length >= 3 && movieSeriesName === currentSeriesName) {
                isMatch = true;
            }
            else if (currentMovieBase.length >= 5 && movieBase.length >= 5 && currentMovieBase === movieBase) {
                isMatch = true;
            }
            else if (currentSeriesName.length >= 5 && movieSeriesName.length >= 5) {
                if (movieSeriesName.indexOf(currentSeriesName) === 0 || 
                    currentSeriesName.indexOf(movieSeriesName) === 0) {
                    isMatch = true;
                }
            }
            
            if (isMatch) {
                sameSeriesMovies.push({
                    movie: movie,
                    episode: movieEpisode
                });
            } else {
                otherCategoryMovies.push(movie);
            }
        }
        
        sameSeriesMovies.sort(function(a, b) {
            if (a.episode === -1 && b.episode === -1) return 0;
            if (a.episode === -1) return 1;
            if (b.episode === -1) return -1;
            return b.episode - a.episode;
        });
        
        var sortedSameSeriesIndex = -1;
        for (var s = 0; s < sameSeriesMovies.length; s++) {
            if (sameSeriesMovies[s].episode < currentEpisode || currentEpisode === -1) {
                sortedSameSeriesIndex = s;
                break;
            }
        }
        
        var prioritizedSeries = [];
        if (sortedSameSeriesIndex >= 0) {
            for (var p = sortedSameSeriesIndex; p < sameSeriesMovies.length; p++) {
                prioritizedSeries.push(sameSeriesMovies[p].movie);
            }
            for (var q = 0; q < sortedSameSeriesIndex; q++) {
                prioritizedSeries.push(sameSeriesMovies[q].movie);
            }
        } else {
            for (var r = 0; r < sameSeriesMovies.length; r++) {
                prioritizedSeries.push(sameSeriesMovies[r].movie);
            }
        }
        
        console.log('Same series episodes found:', prioritizedSeries.length);
        
        for (var j = otherCategoryMovies.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var temp = otherCategoryMovies[j];
            otherCategoryMovies[j] = otherCategoryMovies[k];
            otherCategoryMovies[k] = temp;
        }
        
        var combined = prioritizedSeries.concat(otherCategoryMovies);
        this.similar_movies = combined.slice(0, 15);
        
        console.log('Final order:');
        for (var f = 0; f < this.similar_movies.length; f++) {
            console.log((f+1) + '. ' + this.similar_movies[f].name);
        }
        
        this.renderSimilarMovies();
    },
    renderSimilarMovies: function() {
        var container = $('#similar-movies-container');
        container.empty();
        
        if (this.similar_movies.length === 0) {
            $('#similar-movies-section').hide();
            return;
        }
        
        for (var i = 0; i < this.similar_movies.length; i++) {
            var movie = this.similar_movies[i];
            var poster = movie.stream_icon || movie.cover || movie.cover_big || 'images/404.png';
            var name = movie.name || 'Unknown';
            console.log('Similar movie ' + i + ':', name, 'poster:', poster);
            
            var html = '<div class="similar-movie-item" data-index="' + i + '" ' +
                       'onclick="vod_summary_page.selectSimilarMovie(' + i + ')" ' +
                       'onmouseenter="vod_summary_page.hoverSimilarMovie(' + i + ')">' +
                       '<img src="' + poster + '" onerror="this.src=\'images/404.png\'">' +
                       '<div class="similar-movie-name">' + name + '</div>' +
                       '</div>';
            container.append(html);
        }
        
        $('#similar-movies-section').show();
        this.keys.similar_index = 0;
    },
    hoverSimilarMovie: function(index) {
        if (index < 0) index = 0;
        if (index >= this.similar_movies.length) index = this.similar_movies.length - 1;
        
        this.keys.similar_index = index;
        $('.similar-movie-item').removeClass('active');
        $('.similar-movie-name').removeClass('marquee');
        var activeItem = $('.similar-movie-item[data-index="' + index + '"]');
        activeItem.addClass('active');
        
        var nameElement = activeItem.find('.similar-movie-name');
        if (nameElement.length > 0) {
            var textWidth = nameElement[0].scrollWidth;
            var containerWidth = nameElement.width();
            if (textWidth > containerWidth + 5) {
                nameElement.addClass('marquee');
            }
        }
        
        // Scroll into view
        var container = document.getElementById('similar-movies-container');
        var item = activeItem[0];
        if (container && item) {
            var containerRect = container.getBoundingClientRect();
            var itemRect = item.getBoundingClientRect();
            
            if (itemRect.left < containerRect.left) {
                container.scrollLeft -= (containerRect.left - itemRect.left + 20);
            } else if (itemRect.right > containerRect.right) {
                container.scrollLeft += (itemRect.right - containerRect.right + 20);
            }
        }
    },
    selectSimilarMovie: function(index) {
        var movie = this.similar_movies[index];
        if (movie) {
            current_movie = movie;
            this.keys.section = 'buttons';
            this.keys.similar_index = 0;
            this.similar_movies = [];
            this.init(this.prev_route);
        }
    },
    handleSimilarKeyMove: function(increment) {
        var newIndex = this.keys.similar_index + increment;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this.similar_movies.length) newIndex = this.similar_movies.length - 1;
        this.hoverSimilarMovie(newIndex);
    }
}

"use strict";
var SeriesModel={
    movies:[],
    category_name:'series',
    favourite_category_index:'top-1',
    recent_category_index:'bottom-1',
    favourite_insert_position:'before', // or after
    recent_insert_position:'before',
    favourite_movie_count:200,
    recent_movie_count:15,
    movie_key:"stream_id",
    categories:[],
    saved_video_times:{},
    favourite_ids:[],
    init:function(category_name) {
        this.category_name=category_name;
    },
    setCategories:function(categories){
        var temps=localStorage.getItem(storage_id+settings.playlist_url+"saved_series_times");
        if(temps!=null && temps!==''){
            this.saved_video_times=JSON.parse(temps);
        }
        var hidden_categories=localStorage.getItem(storage_id+settings.playlist_url+this.category_name+"_hiddens");
        hidden_categories=hidden_categories==null ? [] : JSON.parse(hidden_categories);
        categories.map(function(category){
            category.is_hide=false;
            if(hidden_categories.includes(category.category_id))
                category.is_hide=true;
        })
        this.categories=categories;
    },
    saveVideoTime:function(stream_id, time){
        var saved_video_times=this.saved_video_times;
        saved_video_times[stream_id.toString()]=time;
        this.saved_video_times=saved_video_times;
        localStorage.setItem(storage_id+settings.playlist_url+"saved_series_times",JSON.stringify(saved_video_times));
    },
    removeVideoTime:function(stream_id){
        var saved_video_times=this.saved_video_times;
        delete saved_video_times[stream_id.toString()];
        this.saved_video_times=saved_video_times;
        localStorage.setItem(storage_id+settings.playlist_url+"saved_series_times",JSON.stringify(saved_video_times));
    },
    saveHiddenCategories:function(category_ids){
        var categories=this.categories;
        categories.map(function(category){
            category.is_hide=false;
            if(category_ids.includes(category.category_id)) {
                category.is_hide = true;
            }
        })
        localStorage.setItem(storage_id+settings.playlist_url+this.category_name+"_hiddens",JSON.stringify(category_ids))
    },
    showAllCategories:function(){
        var categories=this.categories;
        categories.map(function(category){
            category.is_hide=false;
        })
        localStorage.setItem(storage_id+settings.playlist_url+this.category_name+"_hiddens",JSON.stringify([]))
    },
    getCategories:function(include_hide_category,include_favourite_recent){
        var categories=this.categories.filter(function(category){
            if(include_favourite_recent){
                if(!include_hide_category)
                    return !category.is_hide;
                else
                    return true;
            }
            else{
                if(!include_hide_category)
                    return !category.is_hide && (category.category_id!=="favourite" && category.category_id!=="recent");
                else
                    return category.category_id!=="favourite" && category.category_id!=="recent";
            }

        })
        return categories;
    },
    setMovies:function(movies){
        movies=movies.sort(function(a,b){
            return parseInt(a.last_modified)<parseInt(b.last_modified) ? 1
                    : parseInt(a.last_modified)>parseInt(b.last_modified) ? -1 : 0;
        })
        this.movies=movies;
    },
    insertMoviesToCategories:function(){
        var movies=this.movies;
        var categories=this.categories;
        var recent_category={
            category_id:'recent',
            category_name:'Recently Viewed',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        var favourite_category={
            category_id:'favourite',
            category_name:'Favourites',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        var undefined_category={
            category_id:'undefined',
            category_name:'Uncategorized',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        categories.push(undefined_category);
         var temps1=this.getRecentOrFavouriteCategoryPosition('recent');
        var recent_category_position=temps1[0],recent_category_index=temps1[1];
        var temps2=this.getRecentOrFavouriteCategoryPosition('favourite');
        var favourite_category_position=temps2[0], favourite_category_index=temps2[1];

        var movie_id_key=this.movie_key;
        var recent_movie_ids=JSON.parse(localStorage.getItem(storage_id+settings.playlist_url+"_"+this.category_name+"_recent"));
        var favourite_movie_ids=JSON.parse(localStorage.getItem(storage_id+settings.playlist_url+"_"+this.category_name+"_favourite"));
        recent_movie_ids=recent_movie_ids==null ? [] : recent_movie_ids;
        favourite_movie_ids=favourite_movie_ids==null ? [] : favourite_movie_ids;
        this.favourite_ids=favourite_movie_ids;

        var recent_movies=[], favourite_movies=[];
        var that=this;
        var movies_map={};
        movies.map(function(movie){
            movie.is_recent=false;
            movie.is_favourite=false;

            if(typeof movie.category_id=='undefined' || movie.category_id=='null' || movie.category_id==null){
                movie.category_id='undefined';
            }
            if(typeof movies_map[movie.category_id]=="undefined")
                movies_map[movie.category_id]=[];
            movies_map[movie.category_id].push(movie);
            if(recent_movie_ids.includes(movie[movie_id_key]))// if movie id is in recently viewed movie ids
            {
                if(that.recent_insert_position==="before")
                    recent_movies.unshift(movie);
                else
                    recent_movies.push(movie);
                movie.is_recent=true;
            }
            if(favourite_movie_ids.includes(movie[movie_id_key]))// if movie id is in recently viewed movie ids
            {
                if(that.favourite_insert_position==="before")
                    favourite_movies.unshift(movie);
                else
                    favourite_movies.push(movie);
                movie.is_favourite=true;
            }
        });

        for(var  i=0;i<categories.length;i++){ // except favourite, and recent movies
            categories[i].movies=typeof movies_map[categories[i].category_id]!="undefined" ?
                movies_map[categories[i].category_id] : [];
        }
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==='undefined'){
                if(categories[i].movies.length==0){
                    categories.splice(i,1);
                }
                break;
            }
        }


        recent_category.movies=recent_movies;
        favourite_category.movies=favourite_movies;

        if(recent_category_position==="bottom"){
            if(favourite_category_position==="bottom"){  // all are bottom added
                if(favourite_category_index>recent_category_index){  // first favourite, secend recent
                    categories.push(favourite_category);
                    categories.push(recent_category);
                }
                else{
                    categories.push(recent_category);
                    categories.push(favourite_category);
                }
            }
            else{
                categories.unshift(favourite_category);
                categories.push(recent_category);
            }
        }
        else{
            if(favourite_category_position==="top"){  // all are bottom added
                if(favourite_category_index>recent_category_index){  // first favourite, secend recent
                    categories.push(favourite_category);
                    categories.push(recent_category);
                }
                else{
                    categories.push(recent_category);
                    categories.push(favourite_category);
                }
            }
            else{
                categories.unshift(recent_category);
                categories.push(favourite_category);
            }
        }
        var all_category= {
            category_id: 'all',
            category_name: 'All',
            parent_id: 0,
            is_hide: false,
            movies: []
        };
        categories.unshift(all_category);


        this.categories=categories;
    },
    getRecentOrFavouriteCategoryPosition:function(kind){
        var category_index_str_key=this[kind+"_category_index"];
        var temps=category_index_str_key.split("-");
        var category_position=temps[0],category_index=temps[1];
        category_index=parseInt(category_index);
        if(category_position==="bottom")  // if select category from bottom
            category_index=this.categories.length-category_index
        return [category_position, category_index];
    },
    getRecentOrFavouriteCategory:function(kind){
        var categories=this.categories;
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind)[1];
        return this.categories[category_index];
    },
    getRecentOrFavouriteMovies:function(kind){
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind)[1];
        return this.categories[category_index].movies;
    },
    setRecentOrFavouriteMovies:function(movies, kind){
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind)[1];
        this.categories[category_index].movies=movies;
    },
    addRecentOrFavouriteMovie:function(movie, kind) {
        var movies=this.getRecentOrFavouriteMovies(kind);
        console.log(kind, movies);
        var exist=false;
        var movie_id_key=this.movie_key;
        var is_added=false; // if added, it will be true
        for(var i=0;i<movies.length;i++){
            if(movies[i][movie_id_key]==movie[movie_id_key]){
                exist=true;
                break;
            }
        }
        if(!exist){
            var insert_position=this[kind+"_insert_position"];
            if(insert_position==="before")
                movies.unshift(movie);
            else
                movies.push(movie);
            var max_count=this[kind+"_movie_count"];
            movies=movies.splice(0,max_count);
            var movie_ids=movies.map(function(item){
                return item[movie_id_key];
            })
            this.setRecentOrFavouriteMovies(movies,kind)
            localStorage.setItem(storage_id+settings.playlist_url+"_"+this.category_name+"_"+kind, JSON.stringify(movie_ids));
            is_added=true;
        }
        if(is_added && kind==="favourite"){
            this.favourite_ids=movie_ids;
            // var domElement1=getDomElementFromData($('#movie-grids-container').find('.movie-item-container'),'channel_id',movie.series_id);
            // $(domElement1).find('.movie-item-wrapper').prepend('<div class="favourite-badge"><i class="fa fa-star"></i></div>');
            var domElement=home_page.movie_grid_doms[home_page.keys.grid_selection];
            $(domElement).prepend('<div class="favourite-badge"><i class="fa fa-star"></i></div>');
            console.log("here added to favourite", domElement);
        }
    },
    removeRecentOrFavouriteMovie:function(movie_id, kind) {
        var movies=this.getRecentOrFavouriteMovies(kind);
        var movie_id_key=this.movie_key;
        var is_deleted=false;
        for(var i=0;i<movies.length;i++){
            if(movies[i][movie_id_key]==movie_id){
                movies.splice(i,1);
                is_deleted=true;
                break;
            }
        }
        this.setRecentOrFavouriteMovies(movies, kind);
        var movie_ids=movies.map(function(item){
            return item[movie_id_key];
        })
        this.setRecentOrFavouriteMovies(movies,kind)
        localStorage.setItem(storage_id+settings.playlist_url+"_"+this.category_name+"_"+kind, JSON.stringify(movie_ids));
        if(is_deleted && kind==="favourite"){
            this.favourite_ids=movie_ids;
            
            // Check if we're currently viewing the favorites category
            if(typeof current_category !== 'undefined' && current_category.category_id === 'favourite' && 
               typeof current_route !== 'undefined' && current_route === 'home-page') {
                // Refresh the entire category to fill the empty space
                home_page.showCategoryContent();
            } else {
                // If not in favorites view, just remove the DOM element (legacy behavior)
                var domElement=home_page.movie_grid_doms[home_page.keys.grid_selection];
                $(domElement).find('.favourite-badge').remove();
                $(domElement).remove();
            }
        }
    },
    checkForAdult:function(movie){
        var is_adult=false;
        var categories=this.getCategories(false,false);
        for(var i=0;i<categories.length;i++) {
            if (movie.category_id == categories[i].category_id) {
                var category=categories[i];
                var category_name=category.category_name.toLowerCase();
                if(category_name.includes('xxx') ||  category_name.includes('adult') || category_name.includes('porn') || category.parent_id==1)
                    is_adult=true;
                break;
            }
        }
        return is_adult;
    }
}

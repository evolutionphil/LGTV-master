"use strict";
var storage_page={
    keys:{
        focused_part:"menu_selection", // or, "search part", "slider part", "sub menu part", "search_value"
        menu_selection:0, // the index of selected menu,
    },
    video_files:[],
    image_files:[],
    dirs:[],
    current_level:0, //0=>root level, else have parent level
    current_path:'',
    parent_dir:null,
    menu_items:[],
    storages: [

    ],
    video_index:0,
    image_index:0,
    init:function(){
        var storages;
        this.current_level=0;
        this.video_index=0;
        this.image_index=0;

        this.video_files=[];
        this.image_files=[];
        this.current_path='root/';
        this.parent_dir=null;
        if(platform==='samsung') {
            if(typeof storage_environment !== 'undefined' && storage_environment==='develop') {
                storages=[
                    {
                        label:"internal0",
                        state:"MOUNTED",
                        type:"INTERNAL",
                        isFile:true
                    },
                    {
                        label: 'removable_sda',
                        type: 'EXTERNAL',
                        state: 'MOUNTED',
                        isFile:true
                    },
                    {
                        label: 'downloads',
                        type: 'INTERNAL',
                        state: 'MOUNTED'
                    },
                    {
                        label: 'documents',
                        type: 'INTERNAL',
                        state: 'MOUNTED'
                    },
                    {
                        label: 'videos',
                        type: 'INTERNAL',
                        state: 'MOUNTED'
                    },
                    {
                        label: 'music',
                        type: 'INTERNAL',
                        state: 'MOUNTED'
                    },
                    {
                        label: 'ringtones',
                        type: 'INTERNAL',
                        state: 'MOUNTED'
                    },

                ]
                this.storages=storages;
                this.initPage();
            }
            else {
                var that=this;
                function checkCorruptedRemovableDrives(storageList) {
                    var validStorages = [];
                    for (var i = 0; i < storageList.length; i++) {
                        var storage = storageList[i];
                        if (storage.state === 'MOUNTED') {
                            validStorages.push(storage);
                        }
                    }
                    that.storages = validStorages;
                    debugLog('USB Storage: Found', validStorages.length, 'mounted storage(s)');
                    if (validStorages.length === 0) {
                        var msg = current_words['no_usb_connected'] || "No USB storage connected";
                        showToast("Storage", msg);
                        home_page.reEnter();
                        return;
                    }
                    that.initPage();
                }
                try {
                    tizen.filesystem.listStorages(checkCorruptedRemovableDrives);
                }catch (e) {
                    debugLog("USB Storage: Error listing storages", e);
                    that.storages = [];
                    var msg = current_words['no_usb_connected'] || "No USB storage connected";
                    showToast("Storage", msg);
                    home_page.reEnter();
                }
            }
        }
    },
    goBack:function () {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                if(this.current_level==0) {
                    $('#storage-page').hide();
                    home_page.reEnter();
                }else {
                    keys.menu_selection=0;
                    this.handleMenuClick();
                }
                break;
        }
    },
    initPage: function () {
        current_route='storage-page';
        this.renderDirectories();
        home_page.Exit();
        $('#storage-page').show();
    },
    renderDirectories: function () {
        var html='';
        var diff_index=0;
        var created_time='';
        var filename_key;
        var current_level=this.current_level;
        if(current_level==0)
            filename_key='label';
        else
            filename_key='name';
        $('#storage-page-path-container').text(this.current_path);

        if(current_level>0) {  // add back icon here
            diff_index=1;
            html=
                '<div class="menu-item-container">\
                    <div class="menu-item-wrapper back" data-back="1"\
                        onmouseenter="storage_page.hoverMenuItem('+(0)+')"\
                        onclick="storage_page.handleMenuClick()" \
                    >\
                        <div class="menu-item-img-wrapper">\
                            <img class="menu-item-icon folder-icon" src="images/folder_back.png">\
                        </div>\
                        <div class="menu-item-title-wrapper">\
                            <div class="menu-item-title">Upper Folder</div> \
                            <div class="menu-item-time"></div>\
                        </div> \
                    </div>\
                </div>'
        }
        this.storages.map(function (item, index) {
            var file_type=item.isFile ? 'file' : 'directory';
            var src_image="images/folder.png";
            if(file_type==='file') {
                var ext=getExt(item.name);
                if(image_file_exts.indexOf(ext) > -1) {
                    src_image=item.toURI();
                }else
                    src_image="images/video_icon.png";
            }

            if(item.created)
                created_time=moment(item.created).format('DD.MMM.Y');
            html+=
                '<div class="menu-item-container">\
                    <div class="menu-item-wrapper '+file_type+'"\
                        onmouseenter="storage_page.hoverMenuItem('+(index+diff_index)+')"\
                        onclick="storage_page.handleMenuClick()" \
                    >\
                        <div class="menu-item-img-wrapper">\
                            <img class="menu-item-icon" src="'+src_image+'">\
                        </div>\
                        <div class="menu-item-title-wrapper">\
                            <div class="menu-item-title max-line-2">'+item[filename_key]+'</div> \
                        </div> \
                    </div>\
                </div>'
        })
        // <div class="menu-item-time">'+created_time+'</div> \
        $('#directories-wrapper').html(html);
        this.menu_items=$('.menu-item-wrapper');
        this.hoverMenuItem(0);
    },
    showSubDirectories: function () {
        var keys=this.keys;
        var back=$(this.menu_items[keys.menu_selection]).data('back');
        var current_level=this.current_level;
        var diff_index=current_level==0 ? 0 : 1;
        var storageIndex = keys.menu_selection - diff_index;
        var current_dir = (storageIndex >= 0 && storageIndex < this.storages.length) ? this.storages[storageIndex] : null;

        var current_path;
        if(back==1) { // if back directory icon clicked
            this.current_level-=1;
            this.current_path=this.current_level>0 ? this.parent_dir.path : this.parent_dir.label;
        }
        else {
            if (!current_dir) {
                console.log('Storage: current_dir is undefined, storageIndex:', storageIndex);
                return;
            }
            if (!current_dir.isFile) {
                this.current_level += 1;
                this.parent_dir = current_dir;
                this.current_path = current_dir.fullPath;
            }
        }
        console.log(back,keys.menu_selection, diff_index,current_dir, this.current_level);

        current_path=this.current_path;
        if(this.current_level==1 && current_dir)
            current_path=current_dir.label;
        if(back==1 || (current_dir && !current_dir.isFile)) {
            if (typeof storage_environment !== 'undefined' && storage_environment === 'develop') {
                var files = [
                    {
                        created: "Mon Feb 20 2023 02:41:03 GMT+0100 (CET)",
                        fileSize: 224609179,
                        fullPath: "/opt/media/USBDriveA/System Volume Information",
                        isDirectory: true,
                        isFile: false,
                        name: "System Volume Information",
                        parent: {
                            parent: null, readOnly: false, isFile: false, isDirectory: true,
                            fullPath: "/opt/media/USBDriveA/",
                            name: "USBDriveA"
                        },
                        path: "/opt/media/USBDriveA/",
                        readOnly: false,
                        modified: "Mon Feb 20 2023 02:41:04 GMT+0100 (CET)"
                    },
                    {
                        fullPath: "/opt/media/USBDriveA/demo4.mp4",
                        isDirectory: false,
                        isFile: true,
                        name: "demo4.mp4",
                        fileSize: 224609179,
                        path: "/opt/media/USBDriveA/",
                        parent: {
                            parent: null,
                            isFile: false, isDirectory: true
                        }
                    }
                ]
                this.storages = files;
                this.renderDirectories();
            }
            else{
                if(this.current_level>0)
                    tizen.filesystem.resolve(current_path, onResolveSuccess, null, 'r');
                else {
                    tizen.filesystem.listStorages(checkCorruptedRemovableDrives);
                }
            }
        }
        else
            this.playVideo();
    },
    playVideo: function () {
        var keys=this.keys;
        var current_level=this.current_level;
        var diff_index=current_level==0 ? 0 : 1;
        var file=this.storages[keys.menu_selection-diff_index];
        var ext=getExt(file.name);
        if(video_file_exts.indexOf(ext) > -1) {
            var video_index=0;
            for(var i=0;i<this.video_files.length;i++){
                var item=this.video_files[i];
                if(item.index==keys.menu_selection){
                    video_index=item.video_index;
                    break;
                }
            }
            this.video_index=video_index;
            vod_series_player.makeEpisodeDoms('home-page');
            vod_series_player.init(file,"storage",'storage-page','');
        }
        else if(image_file_exts.indexOf(ext) > -1) {
            var image_index=0;
            for(var i=0;i<this.image_files.length;i++){
                var item=this.image_files[i];
                if(item.index==keys.menu_selection){
                    image_index=item.image_index;
                    break;
                }
            }
            this.image_index=image_index;
            image_page.init(this.image_index);
        }
    },
    hoverMenuItem:function (index) {
        var keys=this.keys;
        $(this.menu_items).removeClass('active');
        $(this.menu_items[index]).addClass('active');
        keys.menu_selection=index;
        keys.focused_part='menu_selection';
        moveScrollPosition($('#directories-wrapper'),this.menu_items[index],'vertical',false);
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                if(checkVerticalMovable(this.menu_items.length,5,keys.menu_selection,increment)){
                    keys.menu_selection+=5*increment;
                    this.hoverMenuItem(keys.menu_selection);
                }
                break;
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                keys.menu_selection+=increment;
                if(keys.menu_selection<0)
                    keys.menu_selection=0;
                if(keys.menu_selection>=this.menu_items.length)
                    keys.menu_selection=this.menu_items.length-1;
                this.hoverMenuItem(keys.menu_selection);
                break;
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                this.showSubDirectories();
                break;

        }
    },
    HandleKey:function(e){
        if(!this.is_drawing) {
            switch (e.keyCode) {
                case tvKey.RIGHT:
                    this.handleMenuLeftRight(1);
                    break;
                case tvKey.LEFT:
                    this.handleMenuLeftRight(-1);
                    break;
                case tvKey.DOWN:
                    this.handleMenusUpDown(1)
                    break;
                case tvKey.UP:
                    this.handleMenusUpDown(-1)
                    break;
                case tvKey.ENTER:
                    this.handleMenuClick();
                    break;
                case tvKey.RETURN:
                    this.goBack();
            }
        }
    }
}

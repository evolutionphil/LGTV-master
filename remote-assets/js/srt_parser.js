"use strict";
var SrtParser={
    seperator:',',
    init:function () {
        this.seperator = ",";
    },
    timestampToSeconds: function(srtTimestamp) {
        var parts = srtTimestamp.split(",");
        var timeString = parts[0];
        var milliseconds = parseInt(parts[1]) || 0;
        
        var timeParts = timeString.split(":").map(function(x) {
            return parseInt(x) || 0;
        });
        
        var hours = timeParts[0] || 0;
        var minutes = timeParts[1] || 0; 
        var seconds = timeParts[2] || 0;
        
        return milliseconds * 0.001 + seconds + 60 * minutes + 3600 * hours;
    },
    correctFormat: function(time) {
        // Enhanced format correction from exo app
        // Fix format inconsistencies and handle various input formats
        var str = time.replace(".", ",");
        var parts = str.split(",");
        var timePart = parts[0] || "00:00:00";
        var milliseconds = parts[1] || "000";
        
        // Ensure proper formatting
        var timeComponents = timePart.split(":");
        var hours = this.fixed_str_digit(2, timeComponents[0] || "0", false);
        var minutes = this.fixed_str_digit(2, timeComponents[1] || "0", false);
        var seconds = this.fixed_str_digit(2, timeComponents[2] || "0", false);
        var ms = this.fixed_str_digit(3, milliseconds);
        
        return hours + ':' + minutes + ':' + seconds + ',' + ms;
    },
    /*
    // make sure string is 'how_many_digit' long
    // if str is shorter than how_many_digit, pad with 0
    // if str is longer than how_many_digit, slice from the beginning
    // Example:

    Input: fixed_str_digit(3, '100')
    Output: 100
    Explain: unchanged, because "100" is 3 digit

    Input: fixed_str_digit(3, '50')
    Output: 500
    Explain: pad end with 0

    Input: fixed_str_digit(3, '50', false)
    Output: 050
    Explain: pad start with 0

    Input: fixed_str_digit(3, '7771')
    Output: 777
    Explain: slice from beginning
    */
    fixed_str_digit(how_many_digit, str, padEnd = true) {
        if (str.length == how_many_digit) {
            return str;
        }
        if (str.length > how_many_digit) {
            return str.slice(0, how_many_digit);
        }
        if (str.length < how_many_digit) {
            if (padEnd) {
                return str.padEnd(how_many_digit, "0");
            }
            else {
                return str.padStart(how_many_digit, "0");
            }
        }
    },
    tryComma(data) {
        data = data.replace(/\r/g, "");
        var regex = /(\d+)\n(\d{1,2}:\d{2}:\d{2},\d{1,3}) --> (\d{1,2}:\d{2}:\d{2},\d{1,3})/g;
        var data_array = data.split(regex);
        data_array.shift(); // remove first '' in array
        return data_array;
    },
    tryDot(data) {
        data = data.replace(/\r/g, "");
        var regex = /(\d+)\n(\d{1,2}:\d{2}:\d{2}\.\d{1,3}) --> (\d{1,2}:\d{2}:\d{2}\.\d{1,3})/g;
        var data_array = data.split(regex);
        data_array.shift(); // remove first '' in array
        this.seperator = ".";
        return data_array;
    },
    fromSrt(data) {
        if(data.trim()=='')
            return [];
        var start_time=new Date().getTime();
        var originalData = data;
        var data_array = this.tryComma(originalData);
        if (data_array.length == 0) {
            data_array = this.tryDot(originalData);
        }
        var items = [];
        for (var i = 0; i < data_array.length; i += 4) {
            var startTime = this.correctFormat(data_array[i + 1].trim());
            var endTime = this.correctFormat(data_array[i + 2].trim());
            var new_line = {
                id: data_array[i].trim(),
                startTime,
                startSeconds: this.timestampToSeconds(startTime),
                endTime,
                endSeconds: this.timestampToSeconds(endTime),
                text: data_array[i + 3].trim(),
            };
            items.push(new_line);
        }
        var end_time=new Date().getTime();
        console.log(end_time-start_time,"ms take to parse")
        return items;
    }
}

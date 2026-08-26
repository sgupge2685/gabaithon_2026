export interface Weather {
  locationName: string;               // 地域名（例: "世田谷区", "福岡市" など。）
  date: string;                       // 日付（例: "2026-08-27"）
  weatherText: string;                // 天気（例: "晴れ", "雨", "くもり", "雪"）
  temperatureMax: number;             // 今日の最高気温（熱中症・水分補給の注意喚起）
  temperatureMin: number;             // 今日の最低気温（寒暖差・路面凍結の予測）
  humidityDaytime: number;            // 日中の湿度（%）（蒸し暑さ・エアコン使用の促し）
  humidityNight: number;              // 夜間の湿度（%）（夜間熱中症の予防）
  rainProbability: number;            // 降水確率（%）（傘の準備・部屋干し・凍結の予測）
  uvIndex: number;                    // 紫外線指数（強い日差し・帽子の着用など）
  windSpeed: number;                  // 風速（m/s）（台風などの強風注意）
  warnings?: string[];                // 気象警報・注意報（例: ["熱中症警戒アラート", "大雨警報"]。ない日は省略可）
}

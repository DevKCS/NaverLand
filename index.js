const { default: axios } = require('axios');
const cheerio = require('cheerio');
function getValues(url) {
    const infoList = url.split('/');
    const lan = infoList[3].split(':')[0];
    const lon = infoList[3].split(':')[1];
    const z = infoList[3].split(':')[2];
    const cortarNo = infoList[3].split(':')[3] || '';
    return [ lan, lon, z, cortarNo ];
}

let areaList = {
    "서울":"1100000000",
    "경기":"4100000000",
    "인천":"2800000000",
    "부산":"2600000000",
    "대전":"3000000000",
    "대구":"2700000000",
    "울산":"3100000000",
    "세종":"3600000000",
    "광주":"2900000000",
    "강원":"4200000000",
    "충북":"4300000000",
    "충남":"4400000000",
    "경북":"4700000000",
    "경남":"4800000000",
    "전북":"4500000000",
    "전남":"4600000000",
    "제주":"5000000000"
}


let type_dict = {
    '매매': 'A1',
    '전세': 'B1',
    '월세': 'B2',
    '단기임대': 'B3'
}
let gun_dict = {
    '아파트': 'APT',
    '빌라': 'VL',
    '단독/다가구': 'DDDGG',
    '상가주택': 'SGJT',
    '원룸': 'OR',
    '상가': 'SG',
    '토지': 'TJ',
    '공장/창고': 'GJCG',
    '지식산업센터': 'APTHGJ',
    '건물': 'GM',
    '오피스텔': 'OPST',
    '아파트분양권': 'ABYG',
    '오피스텔분양권': 'OBYG',
    '재건축': 'JGC',
    '전원주택': 'JWJT',
    '한옥주택': 'HOJT',
    '재개발': 'JGB',
    '고시원': 'GSW',
    '사무실': 'SMS'
}

let header = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlJFQUxFU1RBVEUiLCJpYXQiOjE2NDE4MjMwNTEsImV4cCI6MTY0MTgzMzg1MX0.G2LIx6IATbC1JDuGaK10mllYmb061biA6viyofkZiso',
    'Connection': 'keep-alive',
    'Host': 'new.land.naver.com',
    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': "Windows",
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
}

function convertSquareMeterToPyung(squareMeter) {
    const pyung = squareMeter / 3.305785; // 1평 = 3.305785제곱미터
    return pyung.toFixed(2); // 소수점 두 자리까지 반올림하여 반환
}

/**
 *
 * @param {string} location 조회할 부동산의 위치 (ex. 강남 청담동)
 * @param {Array} tradeType 조회할 부동산의 거래방식 (ex. ["매매"])
 * @param {Array} stateType 조회할 부동산의 건물타입 (ex. ["아파트"])
 * @param {Number} minPrice 조회할 부동산의 최소가격 (단위 : 억) (ex. 10)
 * @param {Number} maxPrice 조회할 부동산의 최대가격 (단위 : 억) (ex. 99)
 * @param {Number} count 조회할 부동산의 개수
 * @returns {Promise<*[]>}
 */
async function getLandList(location, tradeType, stateType, minPrice, maxPrice, count) {
    const results = [];
    const loc = location;
    let response = await axios.get(`https://m.land.naver.com/search/result/${loc}`, { headers: header });
    let url_divide = response.request.path.split('/');
    url_divide.pop();
    url_divide.pop();
    const url = url_divide.join('/');
    const type_key = tradeType.map((e) => type_dict[e]).join(':');
    const gun = stateType.map((e) => gun_dict[e]).join(':');
    let price = '';
    price = `?dprcMin=${minPrice}&dprcMax=${maxPrice}&wprcMin=${minPrice}&wprcMax=${maxPrice}&rprcMin=${minPrice}&rprcMax=${maxPrice}&`;
    response = await axios.get(`https://m.land.naver.com/${url}/${gun}/${type_key}${price}`, { headers: header });
    let [lan, lon, z, cortaNo] = getValues(response.request.path);
    const url_info = `cortarNo=${cortaNo}&rletTpCd=${gun}&tradTpCd=${type_key}&z=${z}&lat=${lan}&lon=${lon}&${price.slice(1)}`;
    const url_dan = `https://m.land.naver.com/cluster/clusterList?view=atcl&${url_info}`;
    response = await axios.get(url_dan, { headers: header });
    const $ = cheerio.load(response.data);
    let total_cnt = 0;
    for (const data of response.data.data.ARTICLE) {
        total_cnt += data.count;
    }
    const url_house = `https://m.land.naver.com/cluster/ajax/articleList?${url_info}sort=dateDesc&page=`;
    let c = 0;
    for (let i = 1; i < parseInt((total_cnt) / 20) + 2; i++) {
        if(c==count) break;
        const house_response = (await axios.get(url_house + i, { headers: header })).data;
        const json_data = house_response.body;
        for (const data of json_data) {
            if(c==count) break;
            results.push(
                    {
                        "번호":data.atclNo,
                        "링크":"https://new.land.naver.com/houses?articleNo="+data.atclNo,
                        "매물":data.atclNm +" - "+data.tradTpNm+" "+data.hanPrc+(data.hanPrc[data.hanPrc.length-1] != "억" ? "만" : ""),
                        "면적": data.rletTpNm+" "+convertSquareMeterToPyung(Number(data.spc1))+"/"+convertSquareMeterToPyung(Number(data.spc2))+"평",
                        "총층":data.flrInfo+", "+data.direction,
                        "특징":data.tagList.join(", "),
                        "거래방식":data.tradTpNm,
                        "건축물이름":data.atclNm
                    }
            )
            c++;
        }
    }
    return results;
}


//건물의 더 자세한 정보를 수집합니다.
/**
 * @param {Number} articleNo 조회할 부동산의 고유번호 (ex. 2317740301)
 * @returns {Promise<any>}
 */
async function getLandDetail(articleNo) {
    let header = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,zh;q=0.5",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlJFQUxFU1RBVEUiLCJpYXQiOjE2ODE2MTYxMDUsImV4cCI6MTY4MTYyNjkwNX0.KIJmNcYjDXluekn_leh8qt-oa3KB5UwzAm675PD4kaw",
        "Connection": "keep-alive",
        "Cookie": "NNB=WCJ5WVLPCHGWG; _ga=GA1.2.2089740020.1675867946; _ga_8P4PY65YZ2=GS1.1.1678618894.1.1.1678618899.0.0.0; nx_ssl=2; wcs_bt=4f99b5681ce60:1681615980; REALESTATE=Sun%20Apr%2016%202023%2012%3A35%3A05%20GMT%2B0900%20(KST)",
        "Host": "new.land.naver.com",
        "Referer": "https://new.land.naver.com/houses?articleNo="+articleNo,
        "sec-ch-ua": '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "Windows",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
    }
    let detail = (await axios.get("https://new.land.naver.com/api/articles/"+articleNo+"?complexNo=", { headers: header })).data
    return detail
}


console.time()
getLandList("강남 청담동", ["매매"],["아파트"],0,99999,10).then(
    async (e) => {
        //console.log(e)
        //console.log(await getLandDetail(e[0]["번호"]))
        console.timeEnd()
    }
)

(() => {
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    if (!citySelect || !districtSelect) return;

    const commonCities = [
        'Hà Nội', 'TP. Hồ Chí Minh', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
        'Huế', 'Bình Dương', 'Đồng Nai', 'Bắc Ninh', 'Khánh Hòa', 'Lâm Đồng', 'Nghệ An',
        'Thanh Hóa', 'Quảng Ninh', 'Nam Định', 'Vĩnh Phúc', 'Bà Rịa - Vũng Tàu'
    ];
    const commonDistricts = [
        'Ba Đình', 'Bắc Từ Liêm', 'Bình Thạnh', 'Bình Tân', 'Cầu Giấy', 'Cẩm Lệ',
        'Gò Vấp', 'Hai Bà Trưng', 'Hà Đông', 'Hải Châu', 'Hoàn Kiếm', 'Hoàng Mai',
        'Long Biên', 'Ngũ Hành Sơn', 'Nhà Bè', 'Phú Nhuận', 'Quận 1', 'Quận 3',
        'Quận 4', 'Quận 5', 'Quận 7', 'Quận 10', 'Quận 12', 'Sơn Trà', 'Tân Bình',
        'Tân Phú', 'Thanh Khê', 'Thanh Xuân', 'Thủ Đức', 'Tây Hồ'
    ];
    const districtsByCity = new Map();
    const normalize = value => (value || '').trim().toLocaleLowerCase('vi');
    const addOption = (select, value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.append(option);
    };
    const merge = (...groups) => [...new Set(groups.flat().filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'vi'));
    const addKnownDistricts = (cityNames, districts) => cityNames.forEach(city => {
        districtsByCity.set(normalize(city), [...districts]);
    });
    addKnownDistricts(['Hà Nội'], [
        'Ba Đình', 'Bắc Từ Liêm', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Hà Đông',
        'Hoàn Kiếm', 'Hoàng Mai', 'Long Biên', 'Nam Từ Liêm', 'Tây Hồ', 'Thanh Xuân'
    ]);
    addKnownDistricts(['TP. Hồ Chí Minh', 'Hồ Chí Minh', 'TP.HCM', 'TP HCM'], [
        'Bình Chánh', 'Bình Thạnh', 'Bình Tân', 'Cần Giờ', 'Củ Chi', 'Gò Vấp', 'Hóc Môn',
        'Nhà Bè', 'Phú Nhuận', 'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
        'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Tân Bình', 'Tân Phú', 'Thủ Đức'
    ]);
    addKnownDistricts(['Đà Nẵng'], [
        'Cẩm Lệ', 'Hải Châu', 'Hòa Vang', 'Liên Chiểu', 'Ngũ Hành Sơn', 'Sơn Trà', 'Thanh Khê'
    ]);

    function fillCities(roomList, selectedCity = citySelect.dataset.currentCity || citySelect.value) {
        const citiesFromRooms = roomList.map(room => room.city);
        const cities = merge(commonCities, citiesFromRooms, [selectedCity]);
        citySelect.replaceChildren(new Option('Chọn tỉnh / thành phố', ''));
        cities.forEach(city => addOption(citySelect, city));
        if (selectedCity) citySelect.value = selectedCity;
    }

    function fillDistricts(selectedValue = districtSelect.dataset.currentDistrict || districtSelect.value) {
        const city = citySelect.value;
        const knownForCity = districtsByCity.get(normalize(city)) || [];
        const options = merge(knownForCity.length ? knownForCity : commonDistricts, [selectedValue]);
        districtSelect.replaceChildren(new Option('Chọn quận / huyện', ''));
        options.forEach(district => addOption(districtSelect, district));
        districtSelect.disabled = !city;
        if (selectedValue) districtSelect.value = selectedValue;
    }

    let userChangedCity = false;
    fillCities([]);
    fillDistricts();
    citySelect.addEventListener('change', () => { userChangedCity = true; fillDistricts(''); });
    fetch('/api/rooms', { headers: { Accept: 'application/json' } })
        .then(response => response.ok ? response.json() : [])
        .then(data => {
            const roomList = Array.isArray(data) ? data : [];
            roomList.forEach(room => {
                const cityKey = normalize(room.city);
                if (!cityKey || !room.district) return;
                if (!districtsByCity.has(cityKey)) districtsByCity.set(cityKey, []);
                districtsByCity.get(cityKey).push(room.district.trim());
            });
            const selectedCity = citySelect.value;
            const selectedDistrict = userChangedCity ? districtSelect.value : (districtSelect.dataset.currentDistrict || districtSelect.value);
            fillCities(roomList, selectedCity);
            fillDistricts(selectedDistrict);
        })
        .catch(() => {
            fillCities([]);
            fillDistricts();
        });
})();



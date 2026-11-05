const citySelect = document.getElementById('city');
const wardSelect = document.getElementById('ward');
const wardManual = document.getElementById('wardManual');
const addressInput = document.getElementById('address');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const mapStatus = document.getElementById('mapStatus');
const mapPreview = document.getElementById('mapPreview');
const findLocation = document.getElementById('findLocation');
const form = document.getElementById('roomForm');
const imageInput = document.getElementById('imageFiles');
const videoInput = document.getElementById('videoFiles');
const preview = document.getElementById('imagePreview');
const count = document.getElementById('imageCount');
const existingCount = Number(form.dataset.existingImages || 0);
const normalize = value => (value || '').trim().toLocaleLowerCase('vi');
const addOption = (select, label, value) => select.add(new Option(label, value));

async function getJson(url) {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.ok) return response.json();
  } catch { /* Try the public endpoint directly if the app server is unavailable. */ }
  if (url === '/api/locations/provinces') {
    const response = await fetch('https://provinces.open-api.vn/api/v2/p/');
    if (response.ok) return response.json();
  }
  const wardMatch = url.match(/^\/api\/locations\/provinces\/(\d+)\/wards$/);
  if (wardMatch) {
    const response = await fetch(`https://provinces.open-api.vn/api/v2/w/?province=${wardMatch[1]}`);
    if (response.ok) return response.json();
  }
  const query = url.match(/^\/api\/geocode\?q=(.*)$/);
  if (query) {
    const q = decodeURIComponent(query[1]);
    const result = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`).then(r => r.json());
    if (result[0]) return { latitude: Number(result[0].lat), longitude: Number(result[0].lon), label: result[0].display_name };
  }
  throw new Error('Không tải được dữ liệu địa chỉ. Hãy thử tải lại trang.');
}

let provinceList = [];
async function loadProvinces() {
  try {
    provinceList = await getJson('/api/locations/provinces');
    citySelect.replaceChildren(new Option('Chọn tỉnh / thành phố', ''));
    provinceList.forEach(province => { addOption(citySelect, province.name, province.name); citySelect.lastElementChild.dataset.code = String(province.code); });
    const saved = citySelect.dataset.current;
    const match = provinceList.find(province => normalize(province.name) === normalize(saved));
    if (match) citySelect.value = match.name;
    else if (saved) addOption(citySelect, saved, saved), citySelect.value = saved;
    if (citySelect.value) await loadWards(wardSelect.dataset.current);
    if (latitudeInput.value && longitudeInput.value) {
      const lat = Number(latitudeInput.value), lon = Number(longitudeInput.value), pad = 0.012;
      mapPreview.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-pad}%2C${lat-pad}%2C${lon+pad}%2C${lat+pad}&layer=mapnik&marker=${lat}%2C${lon}`;
      mapPreview.hidden = false; mapStatus.textContent = 'Vị trí đã lưu của tin phòng.';
    }
  } catch (error) {
    citySelect.replaceChildren(new Option(error.message, ''));
    mapStatus.textContent = 'Không thể tải danh mục hành chính. Kiểm tra kết nối rồi tải lại.';
  }
}

async function loadWards(saved = '') {
  wardManual.hidden = true; wardManual.disabled = true; wardManual.value = '';
  wardSelect.hidden = false; wardSelect.disabled = true;
  wardSelect.disabled = true;
  wardSelect.replaceChildren(new Option('Đang tải phường / xã…', ''));
  const code = citySelect.selectedOptions[0]?.dataset.code || '';
  if (!code) {
    wardSelect.replaceChildren(new Option('Chọn tỉnh trước', ''));
    if (citySelect.value) { wardSelect.hidden = true; wardManual.hidden = false; wardManual.disabled = false; wardManual.value = saved; }
    return;
  }
  try {
    const wards = code ? await getJson(`/api/locations/provinces/${encodeURIComponent(code)}/wards`) : [];
    wardSelect.replaceChildren(new Option('Chọn phường / xã', ''));
    wards.forEach(ward => addOption(wardSelect, ward.name, ward.name));
    if (saved && ![...wardSelect.options].some(option => normalize(option.value) === normalize(saved))) addOption(wardSelect, saved, saved);
    if (saved) wardSelect.value = [...wardSelect.options].find(option => normalize(option.value) === normalize(saved))?.value || '';
    wardSelect.disabled = false;
  } catch (error) {
    wardSelect.hidden = true; wardSelect.disabled = true;
    wardManual.hidden = false; wardManual.disabled = false; wardManual.value = saved;
    wardManual.setCustomValidity('');
    mapStatus.textContent = 'Danh sách phường/xã đang lỗi. Bạn có thể nhập tên phường/xã để tiếp tục.';
  }
}

citySelect.addEventListener('change', () => loadWards(''));
function clearLocationOnEdit() {
  if (!latitudeInput.value && !longitudeInput.value) return;
  latitudeInput.value = ''; longitudeInput.value = ''; mapPreview.hidden = true; mapPreview.removeAttribute('src');
  mapStatus.textContent = 'Địa chỉ đã đổi. Hãy tìm lại vị trí trên bản đồ.';
}
addressInput.addEventListener('input', clearLocationOnEdit);
wardSelect.addEventListener('change', clearLocationOnEdit);
wardManual.addEventListener('input', clearLocationOnEdit);
citySelect.addEventListener('change', clearLocationOnEdit);
findLocation.addEventListener('click', async () => {
  const ward = wardManual.hidden ? wardSelect.value : wardManual.value;
  const parts = [addressInput.value, ward, citySelect.selectedOptions[0]?.textContent].filter(Boolean);
  if (!addressInput.value.trim() || !ward || !citySelect.value) { mapStatus.textContent = 'Hãy điền đường, tỉnh và phường/xã trước.'; return; }
  findLocation.disabled = true;
  mapStatus.textContent = 'Đang tìm vị trí…';
  try {
    const place = await getJson(`/api/geocode?q=${encodeURIComponent(parts.join(', '))}`);
    latitudeInput.value = place.latitude;
    longitudeInput.value = place.longitude;
    const lat = place.latitude, lon = place.longitude, pad = 0.012;
    mapPreview.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-pad}%2C${lat-pad}%2C${lon+pad}%2C${lat+pad}&layer=mapnik&marker=${lat}%2C${lon}`;
    mapPreview.hidden = false;
    mapStatus.textContent = 'Đã đánh dấu vị trí gần địa chỉ bạn nhập.';
  } catch (error) { mapStatus.textContent = error.message; }
  finally { findLocation.disabled = false; }
});

function showPreviews() {
  preview.replaceChildren();
  [...imageInput.files].forEach(file => {
    const image = document.createElement('img'); image.alt = file.name; image.src = URL.createObjectURL(file); preview.append(image);
  });
  const replace = document.getElementById('replaceMedia')?.checked;
  count.textContent = `${replace ? imageInput.files.length : existingCount + imageInput.files.length} ảnh${imageInput.files.length ? ' sau khi lưu' : ' hiện tại'} · tối thiểu 3, tối đa 8 ảnh.`;
}
imageInput.addEventListener('change', showPreviews);
document.getElementById('replaceMedia')?.addEventListener('change', showPreviews);

async function compressImage(file) {
  if (!file.type.startsWith('image/') || file.size < 500 * 1024 || !('createImageBitmap' in window)) return file;
  try {
    const compress = async () => {
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
      } finally { bitmap.close(); }
    };
    const blob = await Promise.race([compress(), new Promise(resolve => setTimeout(() => resolve(null), 12000))]);
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() });
  } catch { return file; }
}

form.addEventListener('submit', async event => {
  const selectedImages = [...imageInput.files];
  const replace = document.getElementById('replaceMedia')?.checked;
  const finalCount = replace ? selectedImages.length : existingCount + selectedImages.length;
  if (finalCount < 3 || finalCount > 8) { event.preventDefault(); imageInput.setCustomValidity(finalCount < 3 ? 'Mỗi tin cần ít nhất 3 ảnh.' : 'Mỗi tin tối đa 8 ảnh.'); imageInput.reportValidity(); return; }
  imageInput.setCustomValidity('');
  if (form.dataset.optimized === 'true') return;
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"],button:not([type])');
  const originalLabel = submit?.textContent;
  if (submit) { submit.disabled = true; submit.textContent = 'Đang tối ưu ảnh…'; }
  try {
    const optimizedImages = await Promise.all(selectedImages.map(compressImage));
    const transfer = new DataTransfer();
    optimizedImages.forEach(file => transfer.items.add(file));
    imageInput.files = transfer.files;
    if (!form.reportValidity()) { if (submit) { submit.disabled = false; submit.textContent = originalLabel; } return; }
    form.dataset.optimized = 'true';
    HTMLFormElement.prototype.submit.call(form);
  } catch {
    if (submit) { submit.disabled = false; submit.textContent = originalLabel; }
    imageInput.setCustomValidity('Không xử lý được ảnh. Hãy thử chọn lại ảnh rồi lưu.');
    imageInput.reportValidity();
  }
});

loadProvinces();

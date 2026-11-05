(() => {
const panel = document.getElementById('roomEngagement');
const roomId = Number(panel.dataset.roomId);
const signedIn = panel.dataset.signedIn === 'true';
const canReview = panel.dataset.canReview === 'true';
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

function renderReviews(data) {
  panel.replaceChildren();
  const head = node('div', 'engagement-head');
  const summary = node('div');
  summary.append(node('h2', '', 'Yêu thích và đánh giá'));
  summary.append(node('p', 'muted', data.count ? `★ ${data.average.toFixed(1)} / 5 · ${data.count} đánh giá` : 'Chưa có đánh giá. Hãy là người đầu tiên!'));
  const favorite = node('button', 'button secondary', '♡ Yêu thích');
  favorite.type = 'button';
  favorite.disabled = !signedIn;
  if (!signedIn) {
    favorite.disabled = false;
    favorite.textContent = 'Đăng nhập để yêu thích';
  }
  head.append(summary, favorite);
  panel.append(head);

  async function updateFavorite() {
    if (!signedIn) { location.href = '/login'; return; }
    favorite.disabled = true;
    try {
      const savedResponse = await fetch('/api/favorites', { headers: { Accept: 'application/json' } });
      if (savedResponse.status === 401) { location.href = '/login'; return; }
      const saved = savedResponse.ok ? await savedResponse.json() : [];
      const isSaved = saved.some(room => Number(room.id) === roomId);
      const result = await fetch('/api/favorites/' + roomId, { method: isSaved ? 'DELETE' : 'POST', headers: { Accept: 'application/json' } });
      if (!result.ok) throw new Error('Không cập nhật được danh sách yêu thích.');
      favorite.textContent = isSaved ? '♡ Yêu thích' : '♥ Đã yêu thích';
    } catch (error) { favorite.title = error.message; }
    finally { favorite.disabled = false; }
  }
  favorite.addEventListener('click', updateFavorite);
  if (signedIn) {
    fetch('/api/favorites', { headers: { Accept: 'application/json' } }).then(response => response.ok ? response.json() : []).then(saved => {
      if (saved.some(room => Number(room.id) === roomId)) favorite.textContent = '♥ Đã yêu thích';
    }).catch(() => {});
  }

  if (canReview) {
    const form = node('form', 'review-form');
    form.append(node('h3', '', data.mine ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá'));
    const ratingLabel = node('label', 'field', 'Số sao');
    const rating = node('select');
    rating.name = 'rating'; rating.required = true;
    for (let score = 5; score >= 1; score--) {
      const option = new Option(`${'★'.repeat(score)}${'☆'.repeat(5-score)} (${score} sao)`, String(score));
      rating.add(option);
    }
    if (data.mine) rating.value = String(data.mine.rating);
    ratingLabel.append(rating);
    const commentLabel = node('label', 'field', 'Nhận xét (không bắt buộc)');
    const comment = node('textarea');
    comment.name = 'comment'; comment.maxLength = 1000; comment.rows = 3;
    comment.placeholder = 'Chia sẻ trải nghiệm của bạn về phòng này…';
    if (data.mine) comment.value = data.mine.comment;
    commentLabel.append(comment);
    const submit = node('button', 'button', data.mine ? 'Cập nhật đánh giá' : 'Gửi đánh giá');
    submit.type = 'submit';
    const status = node('p', 'muted', 'Mỗi tài khoản có thể gửi một đánh giá cho phòng và chỉnh sửa sau đó.');
    form.append(ratingLabel, commentLabel, submit, status);
    form.addEventListener('submit', async event => {
      event.preventDefault(); submit.disabled = true; status.textContent = 'Đang gửi…';
      try {
        const response = await fetch(`/api/rooms/${roomId}/reviews`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ rating: Number(rating.value), comment: comment.value })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Không gửi được đánh giá.');
        await loadReviews();
      } catch (error) { status.textContent = error.message; submit.disabled = false; }
    });
    panel.append(form);
  } else if (!signedIn) {
    const login = node('a', 'button secondary', 'Đăng nhập để đánh giá');
    login.href = '/login'; panel.append(login);
  }

  const list = node('div', 'review-list');
  data.reviews.forEach(review => {
    const item = node('article', 'review-item');
    const top = node('div', 'review-top');
    top.append(node('b', '', review.full_name), node('span', 'review-stars', `${'★'.repeat(Number(review.rating))}${'☆'.repeat(5-Number(review.rating))}`));
    item.append(top);
    if (review.comment) item.append(node('p', '', review.comment));
    item.append(node('small', 'muted', new Date(review.updated_at || review.created_at).toLocaleDateString('vi-VN')));
    list.append(item);
  });
  if (data.reviews.length) panel.append(list);
}

async function loadReviews() {
  const response = await fetch(`/api/rooms/${roomId}/reviews`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!response.ok) throw new Error('Không tải được đánh giá.');
  renderReviews(await response.json());
}

loadReviews().catch(error => { panel.classList.add('error'); panel.textContent = error.message; });
})();

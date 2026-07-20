import { supabaseAuth } from './supabase-auth.js';
import { supabase, subscribeToTable } from './supabase.js';

const channelButtons = document.querySelectorAll('.channel-pill');
const revealCards = document.querySelectorAll('.reveal-card');
const visualAudioBeams = document.querySelectorAll('.audio-beam');
const hero = document.querySelector('.silent-disco-hero');
const discoStageWrapper = document.querySelector('.disco-stage-wrapper');
const discoStage = document.querySelector('.disco-stage');
const stageLights = document.querySelectorAll('.stage-light');
const stageSpinBtn = document.querySelector('.stage-spin-btn');

let clubAccessStatus = null;
let clubEnterBtn = null;
let clubCheckBtn = null;
let clubBookingForm = null;
let clubBookingStatus = null;
let clubRatingStars = null;
let clubReviewText = null;
let clubReviewSubmit = null;
let clubReviewStatus = null;
let clubReviewList = null;

let clubAudioContext = null;
let clubBeatSource = null;
let clubMusicGain = null;
let clubHeadsetDetected = false;
let clubAvatarSrc = null;
let clubSelectedRating = 5;

const channelPresets = [
  { color: '#ff8a00', label: 'Channel 1', intensity: 1 },
  { color: '#35a7ff', label: 'Channel 2', intensity: 1.2 },
  { color: '#b13eff', label: 'Channel 3', intensity: 0.9 }
];

function setHeroPulse(color) {
  if (!hero) return;
  hero.animate(
    [
      { boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
      { boxShadow: `0 0 160px 32px ${color}` }
    ],
    { duration: 1200, direction: 'alternate', iterations: 1, easing: 'ease-out' }
  );
}

function updateChannelState(index) {
  channelButtons.forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === index);
  });

  visualAudioBeams.forEach((beam, beamIndex) => {
    const baseShift = (beamIndex - 1) * 90;
    beam.style.transform = `translateX(${baseShift}px) scaleY(${channelPresets[index].intensity})`;
    beam.style.background = `linear-gradient(180deg, ${channelPresets[index].color}, rgba(255,255,255,0))`;
  });

  setHeroPulse(channelPresets[index].color);
  updateStageLighting(channelPresets[index].color);
}

function animateRevealCards() {
  revealCards.forEach((card, index) => {
    setTimeout(() => card.classList.add('visible'), 160 * index);
  });
}

function animateAudioBeams() {
  visualAudioBeams.forEach((beam, index) => {
    const delay = 0.2 * index;
    beam.animate(
      [
        { transform: beam.style.transform, opacity: 0.72 },
        { transform: beam.style.transform.replace(/scaleY\([^\)]+\)/, 'scaleY(1.5)'), opacity: 1 },
        { transform: beam.style.transform, opacity: 0.72 }
      ],
      { duration: 1700 + index * 150, iterations: Infinity, easing: 'ease-in-out', delay: delay * 1000 }
    );
  });
}

function updateStageLighting(color) {
  if (!stageLights.length) return;
  stageLights.forEach(light => {
    light.style.setProperty('--stage-light-color', color);
    light.style.boxShadow = `0 0 60px 16px ${color}`;
  });
}

function loadClubAvatar() {
  const clubAvatarAnchor = document.querySelector('.club-avatar-anchor');
  if (!clubAvatarAnchor) return;
  const storedAvatar = localStorage.getItem('eau-de-play-club-avatar');
  if (!storedAvatar) return;
  const avatarCircle = clubAvatarAnchor.querySelector('.club-avatar');
  if (!avatarCircle) return;
  avatarCircle.style.backgroundImage = `url(${storedAvatar})`;
  avatarCircle.classList.add('has-avatar');
  clubAvatarSrc = storedAvatar;
}

function joinClubInteraction() {
  const clubLogoLink = document.querySelector('.club-logo-link');
  if (!clubLogoLink) return;
  clubLogoLink.classList.add('is-joining');
  window.setTimeout(() => clubLogoLink.classList.remove('is-joining'), 650);
}

function isDesktopDevice() {
  return window.matchMedia('(min-width: 960px)').matches && !/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isHeadsetConnected() {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
    return false;
  }
  return navigator.mediaDevices.enumerateDevices().then((devices) => {
    const outputDevices = devices.filter((device) => device.kind === 'audiooutput');
    return outputDevices.some((device) => /headphone|earbud|airpods|headset|earphone|soundcore/i.test(device.label));
  }).catch(() => false);
}

function updateClubAccessStatus(message, valid = false) {
  if (!clubAccessStatus) return;
  clubAccessStatus.textContent = message;
  clubAccessStatus.classList.toggle('club-status-valid', valid);
}

async function refreshClubAccess() {
  const desktop = isDesktopDevice();
  const avatarReady = !!clubAvatarSrc;
  const hasAvatar = avatarReady || !!localStorage.getItem('eau-de-play-club-avatar');
  clubAvatarSrc = clubAvatarSrc || localStorage.getItem('eau-de-play-club-avatar');
  const headset = await isHeadsetConnected();
  clubHeadsetDetected = headset;
  const canEnter = desktop && headset && hasAvatar;
  const clubEnterText = canEnter ? 'Enter the club' : 'Club access unavailable';
  if (clubEnterBtn) {
    clubEnterBtn.disabled = !canEnter;
    clubEnterBtn.textContent = clubEnterText;
  }
  if (!desktop) {
    updateClubAccessStatus('Silent Disco club is only available on desktop devices. Switch to a larger screen to enter.', false);
  } else if (!hasAvatar) {
    updateClubAccessStatus('Create your avatar first in the account page before entering the club.', false);
  } else if (!headset) {
    updateClubAccessStatus('Headset not detected. Connect headphones or earbuds before the club music begins.', false);
  } else {
    updateClubAccessStatus('Ready to enter the club. Your avatar and headset are both detected.', true);
  }
}

function setupClubAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  clubAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  clubMusicGain = clubAudioContext.createGain();
  clubMusicGain.gain.value = 0;
  clubMusicGain.connect(clubAudioContext.destination);
  const oscillator = clubAudioContext.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.value = 110;
  oscillator.connect(clubMusicGain);
  oscillator.start();
  clubBeatSource = oscillator;
}

function playClubMusic() {
  if (!clubAudioContext || !clubMusicGain) return;
  if (clubAudioContext.state === 'suspended') {
    clubAudioContext.resume().catch(() => {});
  }
  clubMusicGain.gain.cancelScheduledValues(clubAudioContext.currentTime);
  clubMusicGain.gain.setValueAtTime(0, clubAudioContext.currentTime);
  clubMusicGain.gain.linearRampToValueAtTime(0.16, clubAudioContext.currentTime + 0.8);
}

function stopClubMusic() {
  if (!clubMusicGain) return;
  clubMusicGain.gain.cancelScheduledValues(clubAudioContext.currentTime);
  clubMusicGain.gain.linearRampToValueAtTime(0, clubAudioContext.currentTime + 0.5);
}

async function postClubReview(rating, reviewText) {
  const user = await supabaseAuth.getCurrentUser();
  if (!user) throw new Error('You must be signed in to leave a review.');
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('club_reviews')
    .insert([{ user_id: user.id, rating, review_text: reviewText, created_at: now }]);
  if (error) throw error;
  return data;
}

async function fetchClubReviews() {
  const { data, error } = await supabase
    .from('club_reviews')
    .select('id,user_id,rating,review_text,created_at')
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) {
    console.warn('Unable to load club reviews', error.message || error);
    return [];
  }
  return data || [];
}

function renderClubReviews(reviews) {
  if (!clubReviewList) return;
  if (!reviews.length) {
    clubReviewList.innerHTML = '<p class="club-empty">No reviews yet. Be the first to rate the club!</p>';
    return;
  }
  clubReviewList.innerHTML = reviews.map((review) => `
    <article class="club-review-item">
      <div class="club-review-header">
        <strong>Guest</strong>
        <span class="club-review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
      </div>
      <p>${review.review_text || 'Loved the experience!'}</p>
      <div class="club-review-meta">${new Date(review.created_at).toLocaleDateString()}</div>
    </article>
  `).join('');
}

function convertSpotifyToEmbed(urlOrUri) {
  if (!urlOrUri) return null;
  // Accept spotify:track:ID or spotify:playlist:ID or full open.spotify.com URLs
  const spotifyMatch = urlOrUri.match(/spotify:(track|playlist|album):([a-zA-Z0-9]+)|open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (!spotifyMatch) return null;
  const kind = spotifyMatch[1] || spotifyMatch[3];
  const id = spotifyMatch[2] || spotifyMatch[4];
  if (!kind || !id) return null;
  return `https://open.spotify.com/embed/${kind}/${id}`;
}

function attachClubReviewEvents() {
  if (!clubRatingStars || !clubReviewSubmit || !clubReviewText || !clubReviewStatus) return;
  clubRatingStars.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      clubSelectedRating = Number(button.dataset.value) || 5;
      clubRatingStars.querySelectorAll('button').forEach((star) => {
        star.classList.toggle('active', Number(star.dataset.value) <= clubSelectedRating);
      });
    });
  });

  clubReviewSubmit.addEventListener('click', async () => {
    const text = clubReviewText.value.trim();
    if (!text) {
      clubReviewStatus.textContent = 'Please add your review before submitting.';
      clubReviewStatus.className = 'club-status club-status-error';
      return;
    }
    clubReviewSubmit.disabled = true;
    clubReviewStatus.textContent = 'Saving your review...';
    clubReviewStatus.className = 'club-status';
    try {
      await postClubReview(clubSelectedRating, text);
      clubReviewStatus.textContent = 'Review submitted. Thank you!';
      clubReviewStatus.className = 'club-status club-status-success';
      clubReviewText.value = '';
      const reviews = await fetchClubReviews();
      renderClubReviews(reviews);
    } catch (error) {
      clubReviewStatus.textContent = error?.message || 'Could not save your review. Please try again later.';
      clubReviewStatus.className = 'club-status club-status-error';
    } finally {
      clubReviewSubmit.disabled = false;
    }
  });
}

function setupClubReviewsRealtime() {
  try {
    const channel = subscribeToTable('club_reviews', (payload) => {
      // on new insert/update/delete, refresh local list
      fetchClubReviews().then(renderClubReviews).catch((err) => console.warn('Realtime reviews refresh failed', err));
    });
    window.__club_reviews_channel = channel;
    window.addEventListener('beforeunload', () => { try { channel?.unsubscribe?.(); } catch (e) {} });
  } catch (err) {
    console.warn('Failed to setup realtime reviews', err);
  }
}

function attachClubBookingForm() {
  if (!clubBookingForm || !clubBookingStatus) return;
  clubBookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.querySelector('#tableName')?.value.trim();
    const guests = form.querySelector('#tableGuests')?.value;
    const date = form.querySelector('#tableDate')?.value;
    if (!name || !date) {
      clubBookingStatus.textContent = 'Please provide your name and reservation date/time.';
      clubBookingStatus.className = 'club-status club-status-error';
      return;
    }
    if (!clubAvatarSrc) {
      clubBookingStatus.textContent = 'You need an avatar before booking a table.';
      clubBookingStatus.className = 'club-status club-status-error';
      return;
    }
    clubBookingStatus.textContent = 'Saving table reservation...';
    clubBookingStatus.className = 'club-status';
    clubBookingForm.querySelector('button[type="submit"]').disabled = true;

    try {
      const currentUser = await supabaseAuth.getCurrentUser();
      if (!currentUser) throw new Error('Sign in to book your table.');
      const payload = {
        serviceId: null,
        serviceName: 'Silent Disco Table Booking',
        where: `Club table for ${guests} guests`,
        start: date,
        total: 49.99,
        customerName: name,
        customerPhone: '',
        customerEmail: currentUser.email,
        userEmail: currentUser.email,
        payment: { system: 'paypal', status: 'pending' }
      };
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to create table booking');
      }
      const payPalUrl = new URL('https://www.paypal.com/cgi-bin/webscr');
      payPalUrl.searchParams.set('cmd', '_xclick');
      const businessEmail = window.__APP_CONFIG__?.paypalBusinessEmail || '';
      if (businessEmail) payPalUrl.searchParams.set('business', businessEmail);
      payPalUrl.searchParams.set('item_name', `Silent Disco table booking for ${name}`);
      payPalUrl.searchParams.set('amount', '49.99');
      payPalUrl.searchParams.set('currency_code', 'EUR');
      payPalUrl.searchParams.set('no_shipping', '1');
      payPalUrl.searchParams.set('return', `${window.location.origin}/booking-confirmation.html?bookingId=${encodeURIComponent(result.booking.id)}&paymentStatus=success`);
      payPalUrl.searchParams.set('cancel_return', `${window.location.origin}/booking-confirmation.html?bookingId=${encodeURIComponent(result.booking.id)}&paymentStatus=cancelled`);
      clubBookingStatus.textContent = 'Redirecting to PayPal...';
      window.location.assign(payPalUrl.toString());
    } catch (error) {
      clubBookingStatus.textContent = error?.message || 'Unable to create booking. Please try again.';
      clubBookingStatus.className = 'club-status club-status-error';
    } finally {
      clubBookingForm.querySelector('button[type="submit"]').disabled = false;
    }
  });
}

function handleStagePointer(event) {
  if (!discoStage || !discoStageWrapper) return;
  const rect = discoStageWrapper.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const rotateY = (x - 0.5) * 34;
  const rotateX = 20 + (y - 0.5) * 16;
  discoStage.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function resetStagePosition() {
  if (!discoStage) return;
  discoStage.style.transform = 'rotateX(20deg) rotateY(0deg)';
}

function spinStage() {
  if (!discoStage) return;
  discoStage.animate(
    [
      { transform: discoStage.style.transform },
      { transform: 'rotateX(20deg) rotateY(380deg)' }
    ],
    { duration: 1800, easing: 'ease-in-out' }
  );
}

function createParticleDot() {
  const dot = document.createElement('span');
  dot.className = 'disco-particle';
  const size = Math.random() * 8 + 4;
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.left = `${Math.random() * 100}%`;
  dot.style.top = `${Math.random() * 100}%`;
  dot.style.background = `radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.05))`;
  hero.appendChild(dot);
  dot.animate(
    [
      { transform: 'translateY(0) scale(1)', opacity: 1 },
      { transform: `translateY(-${Math.random() * 160 + 40}px) scale(1.4)`, opacity: 0 }
    ],
    { duration: 2500 + Math.random() * 1300, easing: 'ease-out' }
  ).onfinish = () => dot.remove();
}

function startParticleFlow() {
  if (!hero) return;
  const interval = setInterval(() => {
    if (document.hidden) return;
    createParticleDot();
  }, 250);
  hero.dataset.particleInterval = interval;
}

function stopParticleFlow() {
  const interval = hero?.dataset?.particleInterval;
  if (interval) {
    clearInterval(Number(interval));
    delete hero.dataset.particleInterval;
  }
}

async function initSilentDiscoPage() {
  if (!channelButtons.length) return;

  channelButtons.forEach((button, index) => {
    button.addEventListener('click', () => updateChannelState(index));
  });

  updateChannelState(0);
  animateRevealCards();
  animateAudioBeams();
  loadClubAvatar();
  startParticleFlow();

  if (discoStageWrapper) {
    discoStageWrapper.addEventListener('pointermove', handleStagePointer);
    discoStageWrapper.addEventListener('pointerleave', resetStagePosition);
  }

  const clubLogoLink = document.querySelector('.club-logo-link');
  const clubAvatarAnchor = document.querySelector('.club-avatar-anchor');

  if (clubLogoLink) {
    clubLogoLink.addEventListener('click', event => {
      event.preventDefault();
      joinClubInteraction();
      window.location.href = clubLogoLink.href;
    });
  }

  if (clubAvatarAnchor) {
    clubAvatarAnchor.addEventListener('click', () => {
      joinClubInteraction();
    });
  }

  if (stageSpinBtn) {
    stageSpinBtn.addEventListener('click', spinStage);
  }

  clubAccessStatus = document.getElementById('club-access-status');
  clubEnterBtn = document.getElementById('club-enter-btn');
  clubCheckBtn = document.getElementById('club-check-btn');
  clubBookingForm = document.getElementById('club-booking-form');
  clubBookingStatus = document.getElementById('club-booking-status');
  clubRatingStars = document.getElementById('club-rating-stars');
  clubReviewText = document.getElementById('club-review-text');
  clubReviewSubmit = document.getElementById('club-review-submit');
  clubReviewStatus = document.getElementById('club-review-status');
  clubReviewList = document.getElementById('club-review-list');
  const clubSpotifyInput = document.getElementById('club-spotify-input');
  const clubSpotifyPlay = document.getElementById('club-spotify-play');
  const clubSpotifyEmbed = document.getElementById('club-spotify-embed');
  const clubEnableAudioBtn = document.getElementById('club-enable-audio');

  if (clubCheckBtn) {
    clubCheckBtn.addEventListener('click', refreshClubAccess);
  }

  if (clubEnterBtn) {
    clubEnterBtn.addEventListener('click', async () => {
      await refreshClubAccess();
      if (clubEnterBtn.disabled) return;
      playClubMusic();
      joinClubInteraction();
      updateClubAccessStatus('Enjoy the club — the music is playing through your connected headphones.', true);
    });
  }

  if (clubBookingForm) {
    attachClubBookingForm();
  }

  if (clubRatingStars) {
    attachClubReviewEvents();
  }

  setupClubAudio();
  await refreshClubAccess();
  const reviews = await fetchClubReviews();
  renderClubReviews(reviews);
  setupClubReviewsRealtime();

  if (clubSpotifyPlay && clubSpotifyInput && clubSpotifyEmbed) {
    clubSpotifyPlay.addEventListener('click', () => {
      const val = clubSpotifyInput.value && clubSpotifyInput.value.trim();
      const embed = convertSpotifyToEmbed(val);
      if (!embed) {
        clubAccessStatus.textContent = 'Invalid Spotify URL/URI. Paste a playlist or track link.';
        clubAccessStatus.classList.remove('club-status-valid');
        return;
      }
      clubSpotifyEmbed.innerHTML = `<iframe src="${embed}" width="100%" height="80" frameborder="0" allow="encrypted-media; clipboard-write"></iframe>`;
      clubSpotifyEmbed.style.display = 'block';
      // stop oscillator music when using Spotify embed
      stopClubMusic();
    });
  }

  // Click-to-enable audio UX for browsers that require a user gesture
  function updateEnableAudioVisibility() {
    try {
      if (!clubEnableAudioBtn) return;
      if (!clubAudioContext) {
        // not created yet — show enable button so user can initiate
        clubEnableAudioBtn.style.display = '';
        return;
      }
      if (clubAudioContext.state === 'suspended') {
        clubEnableAudioBtn.style.display = '';
      } else {
        clubEnableAudioBtn.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  if (clubEnableAudioBtn) {
    clubEnableAudioBtn.addEventListener('click', async () => {
      try {
        if (!clubAudioContext) setupClubAudio();
        if (clubAudioContext && clubAudioContext.state === 'suspended') {
          await clubAudioContext.resume();
        }
        // play a short soft click so the user knows audio is enabled
        try {
          playClubMusic();
          setTimeout(() => { stopClubMusic(); }, 700);
        } catch (e) { /* ignore */ }
        updateEnableAudioVisibility();
        await refreshClubAccess();
        clubEnableAudioBtn.style.display = 'none';
      } catch (err) {
        console.warn('Audio enable failed', err);
        if (clubAccessStatus) clubAccessStatus.textContent = 'Unable to enable audio. Try again.';
      }
    });
    // initial visibility
    updateEnableAudioVisibility();
  }

  window.addEventListener('visibilitychange', () => {
    if (document.hidden) stopParticleFlow(); else startParticleFlow();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSilentDiscoPage, { once: true });
} else {
  initSilentDiscoPage();
}

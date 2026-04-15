'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const WA_NUMBER = '556195192728';
const WA_TEXT = encodeURIComponent('Olá! Vim pelo site e gostaria de fazer um pedido.');
const WA_HREF = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

const ADDRESS_LINE = 'Av. Israel Pinheiro, Lote 10 — Vila Planalto, Brasília/DF';
const MAPS_QUERY = encodeURIComponent('Avenida Israel Pinheiro, Lote 10, Vila Planalto, Brasília');
const MAPS_EMBED = `https://www.google.com/maps?q=${MAPS_QUERY}&z=16&output=embed`;
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;

const promos = [
  {
    tag: 'Açougue',
    title: 'Picanha peça resfriada',
    size: 'kg',
    price: 'R$ 69,90',
    was: 'R$ 89,90',
    unit: 'kg',
    save: '-22%',
    img: '/assets/img/products/picanha.webp',
  },
  {
    tag: 'Mercearia',
    title: 'Arroz Tio João tipo 1',
    size: '5kg',
    price: 'R$ 25,90',
    was: 'R$ 32,90',
    unit: 'pct',
    save: '-21%',
    img: 'https://images.openfoodfacts.org/images/products/789/350/001/8452/front_pt.3.400.jpg',
  },
  {
    tag: 'Mercearia',
    title: 'Feijão carioca Camil',
    size: '1kg',
    price: 'R$ 6,99',
    was: 'R$ 9,49',
    unit: 'pct',
    save: '-26%',
    img: 'https://images.openfoodfacts.org/images/products/789/600/674/4115/front_pt.6.400.jpg',
  },
  {
    tag: 'Mercearia',
    title: 'Café Pilão torrado e moído',
    size: '500g',
    price: 'R$ 17,90',
    was: 'R$ 22,90',
    unit: 'pct',
    save: '-22%',
    img: 'https://images.openfoodfacts.org/images/products/789/608/901/2019/front_pt.7.400.jpg',
  },
  {
    tag: 'Bebidas',
    title: 'Coca-Cola Original 2L',
    size: '2L',
    price: 'R$ 7,99',
    was: 'R$ 10,99',
    unit: 'un',
    save: '-27%',
    img: '/assets/img/products/coca-cola-2L-original.png',
  },
  {
    tag: 'Laticínios',
    title: 'Leite integral Italac',
    size: '1L',
    price: 'R$ 4,79',
    was: 'R$ 6,19',
    unit: 'un',
    save: '-22%',
    img: 'https://images.openfoodfacts.org/images/products/789/808/064/0017/front_pt.3.400.jpg',
  },
  {
    tag: 'Mercearia',
    title: 'Óleo de soja Soya',
    size: '900ml',
    price: 'R$ 5,99',
    was: 'R$ 8,49',
    unit: 'un',
    save: '-29%',
    img: '/assets/img/products/oleo-soya.png',
  },
  {
    tag: 'Mercearia',
    title: 'Açúcar refinado União',
    size: '1kg',
    price: 'R$ 4,49',
    was: 'R$ 6,29',
    unit: 'pct',
    save: '-28%',
    img: 'https://images.openfoodfacts.org/images/products/789/191/000/1972/front_pt.3.400.jpg',
  },
  {
    tag: 'Laticínios',
    title: 'Queijo Minas Frescal Palmeira',
    size: '500g',
    price: 'R$ 22,90',
    was: 'R$ 28,90',
    unit: 'pct',
    save: '-20%',
    img: '/assets/img/products/queijo-minas-frescal-palmeira.jpg',
  },
  {
    tag: 'Padaria',
    title: 'Pão de forma Pullman tradicional',
    size: '480g',
    price: 'R$ 8,99',
    was: 'R$ 11,49',
    unit: 'un',
    save: '-21%',
    img: '/assets/img/products/pao-de-forma-tradicional-pullman480g.webp',
  },
  {
    tag: 'Hortifruti',
    title: 'Banana prata',
    size: 'kg',
    price: 'R$ 4,99',
    was: 'R$ 6,99',
    unit: 'kg',
    save: '-28%',
    img: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Banana_Prata.jpg',
  },
  {
    tag: 'Limpeza',
    title: 'Sabão em pó OMO',
    size: '1,6kg',
    price: 'R$ 21,90',
    was: 'R$ 28,90',
    unit: 'cx',
    save: '-24%',
    img: '/assets/img/products/sabao-po-omo.jpg',
  },
];

const tickerItems = [
  'Ofertinhas fresquinhas da semana',
  'Entrega pelo bairro · Vila Planalto',
  'Peça direto no WhatsApp',
  'Açougue com cortes sob medida',
  'Hortifruti direto do CEASA-DF',
  'Tá em conta no MM',
  'Brasília · DF · Plano Piloto',
];

const hoursTable = [
  { day: 'Segunda a Sexta', time: '06h — 21h' },
  { day: 'Sábado', time: '06h — 21h' },
  { day: 'Domingo', time: '06h30 — 14h' },
];

function useRevealOnScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const els = document.querySelectorAll('.mm-reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('mm-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mm-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useCountUp(ref, target, options = {}) {
  const { duration = 1500, suffix = '', prefix = '' } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(eased * target);
            el.textContent = `${prefix}${value.toLocaleString('pt-BR')}${suffix}`;
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, target, duration, suffix, prefix]);
}

export default function Landing() {
  const carouselRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [itemIdx, setItemIdx] = useState({ first: 1, last: 1, total: promos.length });
  const atEnd = itemIdx.last >= itemIdx.total;

  const countProducts = useRef(null);
  const countYears = useRef(null);
  const countNeighbors = useRef(null);

  useRevealOnScroll();
  useCountUp(countProducts, 2800, { suffix: '+' });
  useCountUp(countYears, 18, { suffix: ' anos' });
  useCountUp(countNeighbors, 4200, { suffix: '+' });

  const getMetrics = () => {
    const el = carouselRef.current;
    if (!el) return null;
    const card = el.querySelector('[data-card]');
    const step = card ? card.getBoundingClientRect().width + 20 : 320;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const visible = Math.max(1, Math.round(el.clientWidth / step));
    const total = promos.length;
    const maxFirst = Math.max(0, total - visible);
    const rawFirst = el.scrollLeft / step;
    const firstIdx = Math.min(maxFirst, Math.round(rawFirst));
    const lastIdx = Math.min(total - 1, firstIdx + visible - 1);
    return { el, step, max, visible, total, maxFirst, firstIdx, lastIdx };
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const m = getMetrics();
      if (!m) return;
      const evenPct = m.maxFirst > 0 ? m.firstIdx / m.maxFirst : 1;
      setProgress(Math.min(1, Math.max(0, evenPct)));
      setItemIdx({ first: m.firstIdx + 1, last: m.lastIdx + 1, total: m.total });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollCarousel = (dir) => {
    const m = getMetrics();
    if (!m) return;

    if (dir > 0 && m.firstIdx >= m.maxFirst) {
      m.el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (dir < 0 && m.firstIdx <= 0) {
      m.el.scrollTo({ left: m.max, behavior: 'smooth' });
      return;
    }
    m.el.scrollBy({ left: dir * m.step, behavior: 'smooth' });
  };

  return (
    <div
      style={{ background: 'var(--mm-cream)', color: 'var(--mm-ink)' }}
      className="mm-grain min-h-screen overflow-x-hidden"
    >
      {/* NAV */}
      <header className="relative z-30">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 lg:px-10">
          <a href="#topo" className="flex items-center gap-4">
            <Image
              src="/assets/img/logo_mercado_fundo_transparente.png"
              alt="Mercado MM"
              width={96}
              height={96}
              priority
              className="h-[68px] w-[68px] object-contain sm:h-20 sm:w-20"
            />
            <span className="hidden flex-col leading-[0.95] sm:flex">
              <span
                className="font-display text-[26px] sm:text-[30px]"
                style={{
                  color: 'var(--mm-blue-deep)',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                Mercado <em className="italic" style={{ color: 'var(--mm-red)', fontWeight: 700 }}>MM</em>
              </span>
              <span
                className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] sm:text-[12px]"
                style={{ color: 'var(--mm-red)' }}
              >
                Vila Planalto · Brasília/DF
              </span>
            </span>
          </a>

          <nav
            className="hidden items-center gap-9 text-[13px] font-bold uppercase md:flex"
            style={{ color: 'var(--mm-blue-deep)', letterSpacing: '0.18em' }}
          >
            <a href="#ofertas" className="mm-nav-link">Ofertas</a>
            <a href="#mercado" className="mm-nav-link">O Mercado</a>
            <a href="#localizacao" className="mm-nav-link">Localização</a>
            <a href="#horarios" className="mm-nav-link">Horários</a>
          </nav>

          <a
            href={WA_HREF}
            target="_blank"
            rel="noreferrer"
            className="group hidden items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 md:inline-flex"
            style={{ background: 'var(--mm-blue-deep)' }}
          >
            <WhatsAppIcon className="h-5 w-5 text-white" />
            Peça no WhatsApp
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="topo" className="relative">
        <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-6 lg:px-10 lg:pt-10">
          <div className="grid items-stretch gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative flex flex-col justify-between rounded-[28px] border border-black/5 bg-[var(--mm-paper)] p-8 shadow-[0_30px_60px_-30px_rgba(14,59,122,0.35)] sm:p-12 lg:p-14">
              <div className="mm-rise">
                <div
                  className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.28em]"
                  style={{ borderColor: 'rgba(14,59,122,0.15)', color: 'var(--mm-blue-deep)' }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--mm-red)' }} />
                  Mercado de bairro · Vila Planalto · Brasília/DF
                </div>

                <h1
                  className="font-display mm-headline-decor text-[clamp(44px,6.4vw,88px)] leading-[0.96] tracking-[-0.02em] mm-rise"
                  style={{ color: 'var(--mm-blue-deep)', fontWeight: 500, animationDelay: '0.1s' }}
                >
                  <span className="block">Do bairro</span>
                  <span className="block">pra dentro da</span>
                  <em
                    className="font-display italic block"
                    style={{ color: 'var(--mm-red)', fontWeight: 600 }}
                  >
                    sua cozinha.
                  </em>
                </h1>

                <p className="mt-7 max-w-[52ch] text-[16px] leading-relaxed text-black/70 sm:text-[17px] mm-rise" style={{ animationDelay: '0.35s' }}>
                  Hortifruti, açougue, padaria e mercearia com atendimento pelo
                  WhatsApp. A gente entrega na <strong className="font-semibold text-black/85">Vila Planalto,
                    Setor de Clubes e entorno</strong> — com o carinho de quem conhece o bairro.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 mm-rise" style={{ animationDelay: '0.2s' }}>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-3 rounded-full px-7 py-4 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--mm-red)' }}
                >
                  <WhatsAppIcon className="h-5 w-5 text-white" />
                  Fazer pedido agora
                  <span
                    aria-hidden
                    className="grid h-7 w-7 place-items-center rounded-full transition-transform group-hover:translate-x-1"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                  >
                    →
                  </span>
                </a>

                <a
                  href="#localizacao"
                  className="inline-flex items-center gap-2 rounded-full border px-6 py-4 text-[14px] font-semibold transition-colors hover:bg-black/5"
                  style={{ borderColor: 'rgba(14,59,122,0.25)', color: 'var(--mm-blue-deep)' }}
                >
                  <PinIcon className="h-4 w-4" />
                  Como chegar
                </a>

                <div className="flex items-center gap-3 pl-2">
                  <div className="flex -space-x-1.5">
                    {['★', '★', '★', '★', '★'].map((s, i) => (
                      <span key={i} className="text-[18px]" style={{ color: 'var(--mm-yellow)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <span className="text-[12px] font-medium text-black/60">
                    querido pelos vizinhos<br />há mais de uma geração
                  </span>
                </div>
              </div>

              {/* Floating price-tag */}
              <div
                className="pointer-events-none absolute -right-6 top-10 hidden rotate-[9deg] rounded-md px-5 py-4 text-white shadow-[0_18px_32px_-8px_rgba(216,35,42,0.55)] lg:block mm-rise"
                style={{ background: 'var(--mm-red)', animationDelay: '0.5s' }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">Oferta da semana</div>
                <div className="font-display text-[34px] leading-none" style={{ fontWeight: 700 }}>
                  R$ 6<span className="text-[18px] align-top">,49</span>
                </div>
                <div className="text-[11px] opacity-80">tomate italiano · kg</div>
              </div>
            </div>

            {/* RIGHT: framed photo collage */}
            <div className="relative flex flex-col gap-5">
              <div className="relative overflow-hidden rounded-[28px] border border-black/5 shadow-[0_30px_60px_-30px_rgba(14,59,122,0.35)]">
                <div className="relative aspect-[4/5] w-full bg-black/10">
                  <img
                    src="/assets/img/products/ceasa.webp"
                    alt="Hortifruti fresco do CEASA-DF"
                    className="mm-crossfade mm-crossfade-a absolute inset-0 h-full w-full object-cover"
                  />
                  <img
                    src="/assets/img/products/ceasa2.webp"
                    alt="Hortifruti fresco do CEASA-DF"
                    className="mm-crossfade mm-crossfade-b absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div
                  className="absolute left-5 top-5 z-10 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
                  style={{ background: 'var(--mm-blue-deep)' }}
                >
                  Hortifruti · Açougue · Padaria · Mercearia
                </div>
                <div className="absolute bottom-5 left-5 right-5 z-10 flex items-end justify-between text-white">
                  <div className="font-display italic text-[22px] leading-tight drop-shadow">
                    Do produtor<br />para a sua cozinha.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className="overflow-hidden rounded-[20px]"
                  style={{ background: 'var(--mm-sand)' }}
                >
                  <img
                    src="/assets/img/products/paofrancesfolhado.jpg"
                    alt="Pão francês quentinho da padaria"
                    className="block h-40 w-full object-cover sm:h-44"
                  />
                </div>
                <div
                  className="overflow-hidden rounded-[20px]"
                  style={{ background: 'var(--mm-sand)' }}
                >
                  <img
                    src="/assets/img/products/picanha.webp"
                    alt="Picanha no açougue"
                    className="block h-40 w-full object-cover sm:h-44"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* diagonal ticker */}
        <div className="mm-ticker-strip overflow-hidden">
          <div className="flex whitespace-nowrap py-4 text-white mm-marquee-track">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="mx-8 inline-flex items-center gap-4 text-[13px] font-semibold uppercase tracking-[0.22em]">
                <Star />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTAS / CAROUSEL */}
      <section id="ofertas" className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
            <div className="mm-reveal">
              <div
                className="mb-4 inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.34em]"
                style={{ color: 'var(--mm-red)' }}
              >
                <span className="inline-block h-[2px] w-10" style={{ background: 'var(--mm-red)' }} />
                Encarte da semana
              </div>
              <h2
                className="mm-heading text-[clamp(54px,8vw,112px)]"
                style={{ color: 'var(--mm-blue-deep)' }}
              >
                OFERTAS<br />
                <em className="italic" style={{ color: 'var(--mm-red)' }}>DA SEMANA</em>
              </h2>
              <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-black/65">
                Ofertas de hoje selecionadas para você.
              </p>
            </div>

            <div className="flex items-center gap-3 mm-reveal" data-variant="fade-right">
              <button
                onClick={() => scrollCarousel(-1)}
                aria-label="Anterior"
                className="grid h-14 w-14 place-items-center rounded-full border text-[18px] transition-all hover:-translate-y-0.5 hover:bg-black/5"
                style={{ borderColor: 'rgba(14,59,122,0.25)', color: 'var(--mm-blue-deep)' }}
              >
                ←
              </button>
              <button
                onClick={() => scrollCarousel(1)}
                aria-label={atEnd ? 'Voltar ao início' : 'Próximo'}
                className="grid h-14 w-14 place-items-center rounded-full text-white text-[18px] transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--mm-blue-deep)' }}
              >
                {atEnd ? '↺' : '→'}
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="mm-carousel -mx-6 flex gap-5 overflow-x-auto px-6 pb-6 lg:-mx-10 lg:px-10"
          >
            {promos.map((p, i) => (
              <article
                key={i}
                data-card
                className="mm-card mm-reveal relative flex w-[260px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-black/5 bg-[var(--mm-paper)] shadow-[0_22px_44px_-22px_rgba(14,59,122,0.3)] sm:w-[300px]"
                style={{ transitionDelay: `${Math.min(i, 6) * 70}ms` }}
              >
                <div className="relative h-[230px] overflow-hidden sm:h-[270px]">
                  <img src={p.img} alt={p.title} className="mm-card-img h-full w-full object-cover" loading="lazy" />
                  <div
                    className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm"
                    style={{ background: 'rgba(14,59,122,0.85)' }}
                  >
                    {p.tag}
                  </div>
                  <div
                    className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ background: 'var(--mm-red)' }}
                  >
                    {p.save}
                  </div>
                  <div
                    className="absolute -right-3 bottom-4 rotate-[-6deg] rounded-md px-3 py-2 text-white shadow-lg mm-tag-pop"
                    style={{ background: 'var(--mm-red)' }}
                  >
                    <div className="text-[9px] uppercase tracking-[0.18em] opacity-80">Por apenas</div>
                    <div className="font-display text-[22px] leading-none" style={{ fontWeight: 700 }}>
                      {p.price}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <h3
                    className="font-display text-[22px] leading-tight"
                    style={{ color: 'var(--mm-blue-deep)', fontWeight: 500 }}
                  >
                    {p.title}
                  </h3>
                  <div className="mt-2 text-[12px] font-medium uppercase tracking-[0.14em] text-black/50">
                    {p.size} · /{p.unit}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="text-[12px] text-black/50">
                      de <span className="line-through">{p.was}</span>
                    </div>
                    <a
                      href={WA_HREF}
                      target="_blank"
                      rel="noreferrer"
                      className="group/pedir inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: 'var(--mm-red)' }}
                    >
                      Pedir
                      <span className="transition-transform group-hover/pedir:translate-x-1">→</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div
              className="relative h-[4px] flex-1 overflow-hidden rounded-full"
              style={{ background: 'rgba(14,59,122,0.15)' }}
              aria-hidden
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${Math.max(6, progress * 100)}%`,
                  background: 'var(--mm-blue-deep)',
                }}
              />
            </div>
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.22em] tabular-nums"
              style={{ color: 'var(--mm-blue-deep)' }}
            >
              {String(itemIdx.first).padStart(2, '0')}
              <span className="opacity-40">—</span>
              {String(itemIdx.last).padStart(2, '0')}
              <span className="mx-1 opacity-40">/</span>
              {itemIdx.total}
            </span>
          </div>
        </div>
      </section>

      {/* O MERCADO */}
      <section id="mercado" className="relative py-20 lg:py-28" style={{ background: 'var(--mm-paper)' }}>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="relative mm-reveal" data-variant="fade-left">
              <div className="mm-card overflow-hidden rounded-[28px] border border-black/5">
                <img
                  src="https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=1200&q=80"
                  alt="Interior do Mercado MM"
                  className="mm-card-img h-[520px] w-full object-cover"
                />
              </div>
              <div
                className="absolute -bottom-8 -right-4 hidden rounded-[20px] p-5 text-white shadow-xl sm:block lg:-right-8 mm-float"
                style={{ background: 'var(--mm-red)', '--mm-float-rot': '-3deg' }}
              >
                <div className="text-[10px] uppercase tracking-[0.22em] opacity-80">Desde</div>
                <div className="font-display text-[46px] leading-none" style={{ fontWeight: 700 }}>
                  2007
                </div>
                <div className="text-[11px] opacity-90">servindo a Vila Planalto</div>
              </div>

              {/* decorative spinning seal */}
              <div
                className="absolute -top-8 -left-8 hidden h-[120px] w-[120px] place-items-center rounded-full text-white sm:grid mm-spin-slow"
                style={{ background: 'var(--mm-blue-deep)' }}
                aria-hidden
              >
                <svg viewBox="0 0 140 140" className="absolute inset-0 h-full w-full">
                  <defs>
                    <path id="mmCircle" d="M70,70 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
                  </defs>
                  <text className="fill-white font-semibold" style={{ fontSize: 11, letterSpacing: '0.18em' }}>
                    <textPath href="#mmCircle">
                      MERCADO MM · VILA PLANALTO · BRASÍLIA · DF ·&nbsp;
                    </textPath>
                  </text>
                </svg>
                <span className="font-display text-[30px]" style={{ fontWeight: 700 }}>MM</span>
              </div>
            </div>

            <div className="mm-reveal" data-variant="fade-right">
              <div
                className="mb-4 inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.34em]"
                style={{ color: 'var(--mm-red)' }}
              >
                <span className="inline-block h-[2px] w-10" style={{ background: 'var(--mm-red)' }} />
                Aqui na Vila a gente se conhece
              </div>
              <h2
                className="mm-heading text-[clamp(48px,6.5vw,96px)]"
                style={{ color: 'var(--mm-blue-deep)' }}
              >
                O MERCADO<br />
                <em className="italic" style={{ color: 'var(--mm-red)' }}>MM</em>
              </h2>

              <p className="mt-7 max-w-[52ch] text-[16px] leading-relaxed text-black/70">
                O Mercado MM nasceu no coração da Vila Planalto, ali no Plano Piloto onde Brasília
                começou. Aqui você encontra o essencial do mês e o improviso do jantar de última
                hora — com atendimento pelo WhatsApp, entrega na sua porta e aquele sorriso de quem
                já te conhece pelo nome.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3">
                {[
                  { ref: countProducts, v: 'itens no estoque' },
                  { ref: countYears, v: 'de Vila Planalto' },
                  { ref: countNeighbors, v: 'vizinhos atendidos' },
                ].map((s, i) => (
                  <div key={i} className="border-l pl-4" style={{ borderColor: 'rgba(14,59,122,0.2)' }}>
                    <div
                      ref={s.ref}
                      className="font-display text-[34px] leading-tight tabular-nums"
                      style={{ color: 'var(--mm-blue-deep)', fontWeight: 600 }}
                    >
                      0
                    </div>
                    <div className="mt-1 text-[12px] uppercase tracking-[0.14em] text-black/60">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOCALIZAÇÃO + HORÁRIOS */}
      <section id="localizacao" className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="mb-12 text-center mm-reveal">
            <div
              className="mb-4 inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.34em]"
              style={{ color: 'var(--mm-red)' }}
            >
              <span className="inline-block h-[2px] w-10" style={{ background: 'var(--mm-red)' }} />
              Dá um pulo aqui
              <span className="inline-block h-[2px] w-10" style={{ background: 'var(--mm-red)' }} />
            </div>
            <h2
              className="mm-heading text-[clamp(54px,8vw,112px)]"
              style={{ color: 'var(--mm-blue-deep)' }}
            >
              VENHA NOS<br />
              <em className="italic" style={{ color: 'var(--mm-red)' }}>VISITAR</em>
            </h2>
            <p className="mx-auto mt-5 max-w-[54ch] text-[15px] leading-relaxed text-black/65">
              O Mercado MM fica no coração da Vila Planalto, a um pulinho do Plano Piloto.
              Estacionamento fácil, atendimento bom de papo.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="mm-reveal overflow-hidden rounded-[28px] border border-black/5 shadow-[0_30px_60px_-30px_rgba(14,59,122,0.35)]" data-variant="fade-left">
              <iframe
                title="Localização do Mercado MM no Google Maps"
                src={MAPS_EMBED}
                width="100%"
                height="560"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div id="horarios" className="flex flex-col gap-5 mm-reveal" data-variant="fade-right">
              <div
                className="relative overflow-hidden rounded-[28px] border border-black/5 p-8"
                style={{ background: 'var(--mm-blue-deep)', color: 'white' }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ color: 'var(--mm-yellow)' }}>
                  — A gente te espera
                </div>
                <h3 className="mm-heading mt-4 text-[clamp(32px,4vw,44px)]" style={{ color: 'white' }}>
                  ESTAMOS<br />
                  <em className="italic" style={{ color: 'var(--mm-yellow)' }}>BEM AQUI</em>
                </h3>

                <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-white/85">
                  <div className="flex items-start gap-3">
                    <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    {ADDRESS_LINE}
                  </div>
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    +55 (61) 9519-2728
                  </div>
                </div>

                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--mm-yellow)', color: 'var(--mm-blue-deep)' }}
                >
                  Abrir no Google Maps
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>
              </div>

              <div className="rounded-[28px] border border-black/5 bg-[var(--mm-paper)] p-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ color: 'var(--mm-red)' }}>
                  — Tô aberto?
                </div>
                <h3 className="mm-heading mt-3 text-[clamp(30px,3.6vw,40px)]" style={{ color: 'var(--mm-blue-deep)' }}>
                  NOSSOS<br />
                  <em className="italic" style={{ color: 'var(--mm-red)' }}>HORÁRIOS</em>
                </h3>
                <div className="mt-6 divide-y" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                  {hoursTable.map((h) => (
                    <div key={h.day} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-[14px] font-medium uppercase tracking-[0.08em] text-black/80">
                        {h.day}
                      </span>
                      <span
                        className="font-display text-[22px] tabular-nums"
                        style={{ color: 'var(--mm-blue-deep)', fontWeight: 600 }}
                      >
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FAIXA */}
      <section className="relative overflow-hidden" style={{ background: 'var(--mm-red)' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, white 0 2px, transparent 2px 14px)',
          }}
        />
        <div className="relative mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-8 px-6 py-16 text-white lg:px-10 mm-reveal">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80">
              — Peça agora
            </div>
            <h3 className="mm-heading mt-3 text-[clamp(40px,5.2vw,68px)]">
              PEDIDO RÁPIDO,<br />
              <em className="italic">ENTREGA DE VIZINHO.</em>
            </h3>
            <p className="mt-4 max-w-[52ch] text-[15px] text-white/85">
              Manda sua lista no WhatsApp e um atendente do MM resolve pra você.
              Entrega na Vila Planalto, Setor de Clubes e entorno.
            </p>
          </div>
          <a
            href={WA_HREF}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-5 text-[15px] font-semibold transition-transform hover:-translate-y-1"
            style={{ color: 'var(--mm-red)' }}
          >
            <WhatsAppIcon className="h-6 w-6" style={{ color: 'var(--mm-red)' }} />
            Falar com o mercado
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative" style={{ background: 'var(--mm-blue-deep)', color: 'white' }}>
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 lg:grid-cols-4 lg:px-10">
          <div className="lg:col-span-2">
            <Image
              src="/assets/img/logo_mercado_fundo_transparente.png"
              alt="Mercado MM"
              width={72}
              height={72}
              className="h-16 w-16 object-contain"
            />
            <div className="font-display mt-5 text-[28px] leading-tight" style={{ fontWeight: 500 }}>
              Mercado MM
            </div>
            <p className="mt-3 max-w-[38ch] text-[14px] text-white/70">
              O mercado da Vila Planalto. Hortifruti, açougue, padaria e o essencial da sua casa
              com atendimento pelo WhatsApp.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--mm-yellow)' }}>
              Endereço
            </div>
            <p className="mt-3 text-[14px] text-white/80">{ADDRESS_LINE}</p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--mm-yellow)' }}>
              Contato
            </div>
            <p className="mt-3 text-[14px] text-white/80">
              WhatsApp<br />
              <a href={WA_HREF} className="underline-offset-4 hover:underline">+55 (61) 9519-2728</a>
            </p>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-6 text-[12px] text-white/60 md:flex-row md:flex-wrap md:items-center md:justify-between lg:px-10">
            <span>
              © {new Date().getFullYear()} Mercado MM · Vila Planalto, Brasília/DF
              <span className="mx-2 opacity-40">·</span>
              CNPJ 25.103.764/0001-33
            </span>
            <span className="flex items-center gap-2 text-white/70">
              <span className="opacity-60">Desenvolvido por</span>
              <a
                href="#"
                className="font-display text-[14px] font-semibold tracking-tight text-white hover:underline"
                style={{ color: 'var(--mm-yellow)' }}
              >
                Koomplo
              </a>
              <span className="opacity-40">© {new Date().getFullYear()}</span>
            </span>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP */}
      <a
        href={WA_HREF}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir conversa no WhatsApp"
        className="group fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full py-3 pl-3 pr-5 text-white mm-wa-pulse sm:bottom-8 sm:right-8"
        style={{ background: '#25D366' }}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15">
          <WhatsAppIcon className="h-6 w-6 text-white" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-[0.22em] opacity-85">Peça agora</span>
          <span className="text-[13px] font-semibold">WhatsApp</span>
        </span>
      </a>
    </div>
  );
}

function WhatsAppIcon({ className = '', style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      role="img"
      aria-label="WhatsApp"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function PinIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function PhoneIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-current" aria-hidden>
      <path d="M12 2l2.39 6.96H22l-5.89 4.28L18.18 22 12 17.77 5.82 22l2.07-8.76L2 8.96h7.61L12 2z" />
    </svg>
  );
}

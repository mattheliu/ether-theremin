import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { copy, type Language } from '@/lib/i18n';

export function ThereminOrigins({ language }: { language: Language }) {
  const t = copy[language];
  return (
    <>
      <section className="origins" id="origins">
        <div className="origin-introduction">
          <h2>{t.originHeading}</h2>
          <p>{t.originIntro}</p>
        </div>
        <div className="origin-body">
          <figure className="museum-figure">
            <div className="museum-image">
              <Image
                unoptimized
                src="/images/rca-theremin.jpg"
                alt={t.rcaAlt}
                width="333"
                height="500"
                loading="lazy"
              />
            </div>
            <figcaption>
              <strong>{t.rcaCaption}</strong>
              <span>{t.photoCredit}</span>
              <span>
                <a
                  href="https://collections.museumsvictoria.com.au/items/400678"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.museum} ↗
                </a>
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>
              </span>
            </figcaption>
          </figure>
          <div className="history-text">
            <ol className="timeline">
              <li>
                <span className="year">{t.inventionDate}</span>
                <div>
                  <h3>{t.inventionTitle}</h3>
                  <p>{t.invention}</p>
                  <a
                    href="https://moogfoundation.org/bob-moogs-love-of-the-theremin/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.foundation}
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </li>
              <li>
                <span className="year">1928</span>
                <div>
                  <h3>{t.patentTitle}</h3>
                  <p>{t.patent}</p>
                  <a
                    href="https://patents.google.com/patent/US1661058A/en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.patentLink}
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </li>
              <li>
                <span className="year">1929</span>
                <div>
                  <h3>{t.rcaTitle}</h3>
                  <p>{t.rca}</p>
                  <a
                    href="https://collections.museumsvictoria.com.au/items/400678"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Museums Victoria
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </li>
            </ol>
            <div className="artist-note">
              <h3>{t.artistTitle}</h3>
              <p>{t.artist}</p>
              <a
                href="https://nadiareisenberg-clararockmore.org/clara-rockmore-biography/"
                target="_blank"
                rel="noreferrer"
              >
                {t.artistLink}
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="connection">
        <h2>{t.connectionHeading}</h2>
        <div>
          <p>{t.connection}</p>
          <p className="muted">{t.limitation}</p>
          <div className="source-links" aria-label={t.sourceLabel}>
            <a
              href="https://github.com/DanielRapp/doppler"
              target="_blank"
              rel="noreferrer"
            >
              Daniel Rapp · doppler.js (MIT)
              <ArrowUpRight size={14} />
            </a>
            <a
              href="https://www.microsoft.com/en-us/research/publication/soundwave-using-doppler-effect-sense-gestures/"
              target="_blank"
              rel="noreferrer"
            >
              SoundWave · CHI 2012
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

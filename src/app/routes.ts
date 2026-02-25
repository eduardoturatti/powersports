import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { StandingsPage } from './pages/StandingsPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { PremiumPage } from './pages/PremiumPage';
import { TopScorersPage } from './pages/TopScorersPage';
import { TopAssistsPage } from './pages/TopAssistsPage';
import { CardsPage } from './pages/CardsPage';
import { HeadToHeadPage } from './pages/HeadToHeadPage';
import { PlayerPage } from './pages/PlayerPage';
import { LoginPage } from './pages/LoginPage';
import { AboutPage } from './pages/AboutPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: 'classificacao', Component: StandingsPage },
      { path: 'times', Component: TeamsPage },
      { path: 'time/:slug', Component: TeamDetailPage },
      { path: 'jogo/:id', Component: MatchDetailPage },
      { path: 'premium', Component: PremiumPage },
      { path: 'artilharia', Component: TopScorersPage },
      { path: 'assistencias', Component: TopAssistsPage },
      { path: 'cartoes', Component: CardsPage },
      { path: 'mano-a-mano', Component: HeadToHeadPage },
      { path: 'jogador/:id', Component: PlayerPage },
      { path: 'conta', Component: LoginPage },
      { path: 'sobre', Component: AboutPage },
      { path: 'termos', Component: TermsPage },
      { path: 'privacidade', Component: PrivacyPage },
    ],
  },
]);

import { useEffect } from 'react';
import { useRoute, type Route } from './router';
import { Icon } from './components/Icon';
import { Link, useScrolled } from './components/ui';
import { Library } from './screens/Library';
import { useStore } from './store';
import { Collections, CollectionDetail, Favorites } from './screens/Collections';
import { RecipeView } from './screens/RecipeView';
import { CookingMode } from './screens/CookingMode';
import { RecipeEditor } from './screens/RecipeEditor';
import { Settings } from './screens/Settings';

const SECTIONS: { route: Route; label: string; icon: string }[] = [
  { route: { name: 'library' }, label: 'Recipes', icon: 'book' },
  { route: { name: 'favorites' }, label: 'Favorites', icon: 'heart' },
  { route: { name: 'collections' }, label: 'Collections', icon: 'stack' },
];

function section(route: Route): string {
  if (route.name === 'collection') return 'collections';
  if (route.name === 'recipe') return 'library';
  return route.name;
}

function MainBar({ route }: { route: Route }) {
  const scrolled = useScrolled(8);
  const current = section(route);
  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <div className="topbar-inner">
        <Link to={{ name: 'library' }} className="brand" ariaLabel="Recipe Box, home">
          <span className="brand-mark"><Icon name="flame" size={16} stroke={2.2} /></span>
          <span>Recipe Box</span>
        </Link>
        <nav className="nav-links" aria-label="Sections">
          {SECTIONS.map((s) => (
            <Link key={s.label} to={s.route} className={`nav-link${current === s.route.name ? ' active' : ''}`}>{s.label}</Link>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <Link to={{ name: 'settings' }} className="icon-btn plain" ariaLabel="Settings"><Icon name="gear" /></Link>
        <Link to={{ name: 'edit', id: 'new' }} className="icon-btn" ariaLabel="New recipe"><Icon name="plus" size={24} /></Link>
      </div>
    </header>
  );
}

function TabBar({ route }: { route: Route }) {
  const current = section(route);
  return (
    <nav className="tabbar" aria-label="Sections">
      {SECTIONS.map((s) => (
        <Link key={s.label} to={s.route} className={`tab${current === s.route.name ? ' active' : ''}`}>
          <Icon name={s.icon} size={24} filled={s.icon === 'heart' && current === 'favorites'} />
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

function SaveError() {
  const { saveError } = useStore();
  if (!saveError) return null;
  return <div className="save-error" role="alert">Can’t reach the recipe server. Your changes will save when it’s back.</div>;
}

export function App() {
  const route = useRoute();
  const key = JSON.stringify(route);

  useEffect(() => {
    if (route.name !== 'recipe' && route.name !== 'cook') window.scrollTo(0, 0);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (route.name === 'cook') return <><CookingMode key={key} id={route.id} /><SaveError /></>;

  const top = route.name === 'library' || route.name === 'favorites' || route.name === 'collections';
  return (
    <div className="app">
      {top && <MainBar route={route} />}
      <div key={key}>
        {route.name === 'library' && <Library />}
        {route.name === 'favorites' && <Favorites />}
        {route.name === 'collections' && <Collections />}
        {route.name === 'collection' && <CollectionDetail id={route.id} />}
        {route.name === 'recipe' && <RecipeView id={route.id} />}
        {route.name === 'edit' && <RecipeEditor id={route.id} />}
        {route.name === 'settings' && <Settings />}
      </div>
      {route.name !== 'edit' && <TabBar route={route} />}
      <SaveError />
    </div>
  );
}

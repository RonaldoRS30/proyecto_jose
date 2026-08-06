import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';

export default function GuardedNavLink({
  to,
  end = false,
  className,
  children,
  onAfterNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { runGuards } = useNavigationGuard();

  const handleClick = async (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const targetPath = typeof to === 'string' ? to : to.pathname;
    if (location.pathname === targetPath) {
      onAfterNavigate?.();
      return;
    }

    e.preventDefault();
    const canLeave = await runGuards();
    if (canLeave) {
      navigate(to);
      onAfterNavigate?.();
    }
  };

  return (
    <NavLink to={to} end={end} className={className} onClick={handleClick}>
      {children}
    </NavLink>
  );
}

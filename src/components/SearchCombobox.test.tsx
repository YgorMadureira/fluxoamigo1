import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SearchCombobox } from './SearchCombobox';

interface Item { id: string; name: string }

function Harness({ items, onSelect }: { items: Item[]; onSelect: (item: Item) => void }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  return (
    // Mimics the multi-item dialog's scrollable list: a short, clipped
    // container is exactly what clipped the old absolute-positioned dropdown.
    <div style={{ maxHeight: 40, overflowY: 'auto' }} data-testid="scroll-container">
      <SearchCombobox
        value={value}
        onValueChange={setValue}
        open={open}
        onOpenChange={setOpen}
        items={items.filter(i => i.name.toLowerCase().includes(value.toLowerCase()))}
        getKey={i => i.id}
        onSelect={item => { onSelect(item); setValue(item.name); setOpen(false); }}
        placeholder="Buscar..."
        renderItem={i => <span>{i.name}</span>}
      />
    </div>
  );
}

describe('SearchCombobox', () => {
  it('renders the dropdown outside the scrollable ancestor (via portal) so it cannot be clipped', () => {
    const items = [{ id: '1', name: 'Vestido Liso Vinho' }, { id: '2', name: 'Camiseta Branca' }];
    const onSelect = vi.fn();
    render(<Harness items={items} onSelect={onSelect} />);

    fireEvent.focus(screen.getByPlaceholderText('Buscar...'));

    const option = screen.getByText('Vestido Liso Vinho');
    const scrollContainer = screen.getByTestId('scroll-container');
    expect(within(scrollContainer).queryByText('Vestido Liso Vinho')).toBeNull();
    expect(option).toBeInTheDocument();
  });

  it('calls onSelect with the clicked item and closes the dropdown', () => {
    const items = [{ id: '1', name: 'Vestido Liso Vinho' }, { id: '2', name: 'Camiseta Branca' }];
    const onSelect = vi.fn();
    render(<Harness items={items} onSelect={onSelect} />);

    fireEvent.focus(screen.getByPlaceholderText('Buscar...'));
    fireEvent.click(screen.getByText('Camiseta Branca'));

    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(screen.getByPlaceholderText('Buscar...')).toHaveValue('Camiseta Branca');
  });

  it('filters the visible items as the caller narrows the `items` prop while typing', () => {
    const items = [{ id: '1', name: 'Vestido Liso Vinho' }, { id: '2', name: 'Camiseta Branca' }];
    render(<Harness items={items} onSelect={vi.fn()} />);

    const input = screen.getByPlaceholderText('Buscar...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'vestido' } });

    expect(screen.getByText('Vestido Liso Vinho')).toBeInTheDocument();
    expect(screen.queryByText('Camiseta Branca')).toBeNull();
  });
});

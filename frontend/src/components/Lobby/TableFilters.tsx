import React from 'react';
import styled from 'styled-components';

export interface TableFiltersProps {
  filters: {
    search: string;
    status: string;
    players: string;
    gameType: string;
  };
  onFilterChange: (name: string, value: string) => void;
}

const FiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  border: 1px solid #8b0000;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 200px;
`;

const FilterLabel = styled.label`
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #8b0000;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SelectFilter = styled.select`
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #8b0000;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
  }
  
  option {
    background-color: #1b4d3e;
  }
`;

export const TableFilters: React.FC<TableFiltersProps> = ({ filters, onFilterChange }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange('search', e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange(e.target.name, e.target.value);
  };

  return (
    <FiltersContainer>
      <FilterGroup>
        <FilterLabel htmlFor="search">Search Tables</FilterLabel>
        <SearchInput
          id="search"
          type="text"
          placeholder="Table name..."
          value={filters.search}
          onChange={handleSearchChange}
        />
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel htmlFor="status">Table Status</FilterLabel>
        <SelectFilter
          id="status"
          name="status"
          value={filters.status}
          onChange={handleSelectChange}
        >
          <option value="all">All Tables</option>
          <option value="active">Active</option>
          <option value="waiting">Waiting</option>
          <option value="full">Full</option>
        </SelectFilter>
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel htmlFor="players">Players</FilterLabel>
        <SelectFilter
          id="players"
          name="players"
          value={filters.players}
          onChange={handleSelectChange}
        >
          <option value="all">Any Number</option>
          <option value="empty">Empty (0)</option>
          <option value="partial">Partial (1-8)</option>
          <option value="full">Full (9)</option>
        </SelectFilter>
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel htmlFor="gameType">Game Type</FilterLabel>
        <SelectFilter
          id="gameType"
          name="gameType"
          value={filters.gameType}
          onChange={handleSelectChange}
        >
          <option value="all">All Types</option>
          <option value="No Limit">No Limit</option>
          <option value="Pot Limit">Pot Limit</option>
          <option value="Fixed Limit">Fixed Limit</option>
        </SelectFilter>
      </FilterGroup>
    </FiltersContainer>
  );
}; 
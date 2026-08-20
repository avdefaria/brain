UPDATE public.tasks 
SET description = regexp_replace(description, '<p>|</p>', '', 'g')
WHERE description LIKE '%<p>%' OR description LIKE '%</p>%';

import { actions } from '../store/actions';
import { useStore } from '../store/useStore';
import type { Project } from '../types';
import { Modal } from './Modal';
import { ProjectForm } from './ProjectForm';

interface ProjectModalProps {
  project?: Project;
  onClose: () => void;
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const { dispatch } = useStore();

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <ProjectForm
        initial={project}
        onCancel={onClose}
        onSubmit={(input) => {
          dispatch(project ? actions.updateProject(project.id, input) : actions.addProject(input));
          onClose();
        }}
      />
    </Modal>
  );
}

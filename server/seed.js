require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Task = require('./src/models/Task');

const DEMO_EMAIL = 'demo@gestortareas.com';
const DEMO_PASSWORD = 'demo123456';

const SAMPLE_TASKS = [
  {
    title: 'Estudiar para el examen de Cloud Computing',
    description: 'Repasar servicios de AWS, modelos de despliegue y escalabilidad',
    status: 'pendiente',
    priority: 'alta',
    dueDate: '2026-07-18',
  },
  {
    title: 'Subir componente practico 2 - Gestion de Configuracion de Software',
    description: 'Documentar y subir el entregable a la plataforma del curso',
    status: 'pendiente',
    priority: 'alta',
    dueDate: '2026-07-15',
  },
  {
    title: 'Estudiar para el examen de Desarrollo Web',
    description: 'Repasar React, Node/Express, MongoDB y autenticacion JWT',
    status: 'pendiente',
    priority: 'media',
    dueDate: '2026-07-20',
  },
  {
    title: 'Preparar exposicion de Desarrollo Web',
    description: 'Armar diapositivas y guion para presentar el Gestor de Tareas',
    status: 'en_progreso',
    priority: 'alta',
    dueDate: '2026-07-22',
  },
  {
    title: 'Repasar arquitectura del proyecto de Cloud Computing',
    description: 'Revisar el diagrama de la infraestructura antes del examen',
    status: 'pendiente',
    priority: 'media',
    dueDate: '2026-07-17',
  },
  {
    title: 'Documentar avances del componente de Gestion de Configuracion',
    description: 'Actualizar el changelog y las notas de version',
    status: 'en_progreso',
    priority: 'media',
  },
  {
    title: 'Practicar demo de la exposicion de Desarrollo Web',
    description: 'Ensayar el recorrido en vivo de la aplicacion',
    status: 'pendiente',
    priority: 'baja',
    dueDate: '2026-07-21',
  },
  {
    title: 'Revisar rubrica del examen de Cloud Computing',
    description: 'Confirmar los temas que entran y el formato del examen',
    status: 'completada',
    priority: 'baja',
  },
];

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    await Task.deleteMany({ owner: existing._id });
    await existing.deleteOne();
  }

  const user = await User.create({
    name: 'Usuario Demo',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  await Task.insertMany(SAMPLE_TASKS.map((task) => ({ ...task, owner: user._id })));

  console.log(`Seed completo: usuario ${DEMO_EMAIL} / ${DEMO_PASSWORD} con ${SAMPLE_TASKS.length} tareas`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Error al poblar la base de datos:', err.message);
  process.exit(1);
});
